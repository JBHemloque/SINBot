'use strict';

var Discord = require("discord.js");
var search = require('./plugins/search.js');
var config = require('./config.js');
var elizabot = require('./plugins/elizabot.js');
var utils = require('./utils.js');
var package_json = require("./package.json");
var version = package_json.name + " Version " + package_json.version;

var SINBot = new Discord.Client();

var startTime = Date.now();

var enumerate = function(obj) {
	var key;
	for (key in obj) {
		if (typeof obj[key] !== 'function') {
			console.log(key + ": " + obj[key]);
		}
	}
}

var messagebox;

try{
	messagebox = require("./messagebox.json");
} catch(e) {
	//no stored messages
	messagebox = {};
}
function updateMessagebox(){
	require("fs").writeFile("./messagebox.json",JSON.stringify(messagebox,null,2), null);
}

var compileArgs = utils.compileArgs;

function isAdmin(id) {
	return (config.ADMIN_IDS.indexOf(id) > -1);
}

var commands = {
	"ping": {
		help: "Returns pong. Useful for determining if the bot is alive.",
		process: function(args, bot, message) { bot.sendMessage(message.channel, "Pong!"); }
	},
	"version": {
		help: "Display version information for this bot.",
		process: function(args, bot, message) { bot.sendMessage(message.channel, version); }
	},
	"plugins": {
		help: "List the plugins loaded on this bot.",
		adminOnly: true,
		process: function(args, bot, message) {
			var output = "Plugins:";
			for (var i = 0; i < plugins.length; i++) {
				output += "\n    *" + plugins[i].name;
			}
			bot.sendMessage(message.channel, output);
		}
	},
	"servers": {
        help: "Lists servers bot is connected to.",
		adminOnly: true,
        process: function(args, bot, msg) { bot.sendMessage(msg.channel,bot.servers); }
    },
    "channels": {
        help: "Lists channels bot is connected to.",
		adminOnly: true,
        process: function(args, bot, msg) { bot.sendMessage(msg.channel,bot.channels); }
    },
    "myid": {
        help: "Returns the user id of the sender.",
        process: function(args, bot, msg) { bot.sendMessage(msg.channel,msg.author.id); }
    },
    "say": {
        usage: "<message>",
        help: "Bot says message.",
        process: function(args, bot,msg) { bot.sendMessage(msg.channel,compileArgs(args));}
    },
	"announce": {
        usage: "<message>",
        help: "Bot says message with text to speech.",
        process: function(args, bot,msg) { bot.sendMessage(msg.channel,compileArgs(args),{tts:true});}
    },
    "userlist": {
    	help: "Returns a list of users on this server. This is useful for permissions.",
		adminOnly: true,
    	process: function(args,bot,msg) {
    		var output = "User list:";
    		var users = msg.channel.server.members;
    		// console.log("Got " + users.length + " users");
    		for (var i = 0; i < users.length; i += 1) {
    			// console.log(users[i]);
    			output += "\n    " + users[i].username + " [" + users[i].id + "]";
    		}
    		bot.sendMessage(msg.channel,output);
    	}
    },
    "isadmin": {
    	help: "Returns true if the sender is a bot admin",
    	process: function(args,bot,msg) { bot.sendMessage(msg.channel,isAdmin(msg.author.id)); }
    },
    "userid": {
		usage: "<user to get id of>",
		adminOnly: true,
		help: "Returns the unique id of a user. This is useful for permissions.",
		process: function(args,bot,msg) {
			var suffix = compileArgs(args);
			console.log("userid [" + suffix + "]");
			if(suffix){
				var server = msg.channel.server;
				if (server) {
					var users = server.members.getAll("username",suffix);
					if(users.length == 1){
						bot.sendMessage(msg.channel, "The id of " + users[0] + " is " + users[0].id)
					} else if(users.length > 1){
						var response = "multiple users found:";
						for(var i=0;i<users.length;i++){
							var user = users[i];
							response += "\nThe id of " + user + " is " + user.id;
						}
						bot.sendMessage(msg.channel,response);
					} else {
						bot.sendMessage(msg.channel,"No user " + suffix + " found!");
					}
				} else {
					bot.sendMessage(msg.channel, "userid can only be run from a server channel, not a private message.");
				}
			} else {
				bot.sendMessage(msg.channel, "The id of " + msg.author + " is " + msg.author.id);
			}
		}
	},
	"topic": {
		usage: "[topic]",
		help: 'Sets the topic for the channel. No topic removes the topic.',
		process: function(args,bot,msg) {
			bot.setChannelTopic(msg.channel,compileArgs(args), function(error) {
				console.log("Channel topic result: " + error);
			});
		}
	},
	"msg": {
		usage: "<user> <message to leave user>",
		help: "leaves a message for a user the next time they come online.",
		process: function(args,bot,msg) {
			var user = args.shift();
			var message = args.join(' ');
			if(user.startsWith('<@')){
				user = user.substr(2,user.length-3);
			}
			var target = msg.channel.server.members.get("id",user);
			if(!target){
				target = msg.channel.server.members.get("username",user);
			}
			messagebox[target.id] = {
				channel: msg.channel.id,
				content: target + ", " + msg.author + " said: " + message
			};
			updateMessagebox();
			bot.sendMessage(msg.channel,"message saved.")
		}
	},
	"uptime": {
    	usage: "",
		help: "returns the amount of time since the bot started.",
		process: function(args,bot,msg){
			var now = Date.now();
			var msec = now - startTime;
			console.log("Uptime is " + msec + " milliseconds");
			var days = Math.floor(msec / 1000 / 60 / 60 / 24);
			msec -= days * 1000 * 60 * 60 * 24;
			var hours = Math.floor(msec / 1000 / 60 / 60);
			msec -= hours * 1000 * 60 * 60;
			var mins = Math.floor(msec / 1000 / 60);
			msec -= mins * 1000 * 60;
			var secs = Math.floor(msec / 1000);
			var timestr = "";
			if(days > 0) {
				timestr += days + " days ";
			}
			if(hours > 0) {
				timestr += hours + " hours ";
			}
			if(mins > 0) {
				timestr += mins + " minutes ";
			}
			if(secs > 0) {
				timestr += secs + " seconds ";
			}
			bot.sendMessage(msg.channel,"Uptime: " + timestr);
		}
	},
	"help": {
		help: "Display help for this bot.",
		process: function(args, bot, message) {
			var output = version + " commands:";
			var key;
			for (key in commands) {
				output += "\n\t!";
				output += key;
				var usage = commands[key].usage;
				if(usage){
					output += " " + usage;
				}
				output += "\n\t\t\t";
				output += commands[key].help;
			}
			// console.log(output);
			bot.sendMessage(message.channel, output);
		}
	},
};

function findCommand(command) {
	var cmd = commands[command];
	if (cmd) {
		return cmd;
	}
	for (var i = 0; i < plugins.length; i++) {
		try {
			// console.log("Trying " + plugins[i].name + ".findCommand(" + command + ")");
			cmd = plugins[i].plugin.findCommand(command);
			if (cmd) {
				cmd.plugin = plugins[i];
				return cmd;
			}
		} catch(e) {
			console.log("Couldn't call findCommand() on plugin " + plugins[i].name);
		}	
	}
	return null;
}

SINBot.on("message", function(message){
	if (message.author !== SINBot.user) {
		console.log("[" + SINBot.user + "] Got message from " + message.author + ": " + message);
		if (message.content.startsWith(config.COMMAND_PREFIX)) {
			var messageContent = message.content.substr(config.COMMAND_PREFIX.length);
			// First word is a command
			var args = messageContent.split(" ");
			var cmd = findCommand(args[0]);
			if(cmd) {
				if (cmd.hasOwnProperty("adminOnly") && cmd.adminOnly && !isAdmin(message.author.id)) {
					SINBot.sendMessage(message.channel, "Hey " + message.sender + ", you are not allowed to do that!");
				} else {
					try{
						cmd.process(args, SINBot, message);
					} catch(e){
						if(config.debug){
							SINBot.sendMessage(message.channel, "command " + message.content + " failed :(\n" + e.stack);
						}
					}
				}
			} else {
				if(config.respondToInvalid){
					SINBot.sendMessage(message.channel, "Invalid command " + message.content);
				}
			}
		} else if (message.author != SINBot.user && message.isMentioned(SINBot.user)) {
                SINBot.sendMessage(message.channel,message.author + ", you called?");
        }
	} 
});

//Log user status changes
SINBot.on("presence", function(user,status,gameId) {
	//if(status === "online"){
	//console.log("presence update");
	// console.log(user+" went "+status);
	//}
	try{
	if(status != 'offline'){
		if(messagebox.hasOwnProperty(user.id)){
			console.log("found message for " + user.id);
			var message = messagebox[user.id];
			var channel = SINBot.channels.get("id",message.channel);
			delete messagebox[user.id];
			updateMessagebox();
			SINBot.sendMessage(channel,message.content);
		}
	}
	}catch(e){}
});

SINBot.login(config.LOGIN, config.PASSWORD, function(error, token) {
	if (error) {
		console.log("Error logging in: " + error);
	}
	if (token) {
		console.log(version + " logged in with token " + token);
	}
});

var plugins = config.PLUGINS;
for (var i = 0; i < plugins.length; i += 1) {
	try {
		plugins[i].plugin = require(plugins[i].path);
		console.log("Loaded plugin " + plugins[i].name);
	} catch(e) {
		console.log("couldn't load " + plugins[i].name + "!\n"+e.stack);
	}
	try {
		if (plugins[i].plugin.setup) {
			// console.log("Running setup for " + plugins[i].name);
			plugins[i].plugin.setup(plugins[i].config, SINBot);			
		}
	} catch(e) {
		console.log("couldn't run setup for " + plugins[i].name + "!\n"+e.stack);
	}
};