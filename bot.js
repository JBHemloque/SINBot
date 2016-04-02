'use strict';

var async = require('async');
var Discord = require("discord.js");
var search = require('./plugins/search.js');
var elizabot = require('./plugins/elizabot.js');
var utils = require('./utils.js');
var package_json = require("./package.json");
var fs = require("fs");
var version;

var config;
var plugins = {};

var startTime = Date.now();
var compileArgs = utils.compileArgs;
var displayUsage = utils.displayUsage;

var enumerate = function(obj) {
	var key;
	for (key in obj) {
		if (typeof obj[key] !== 'function') {
			console.log(key + ": " + obj[key]);
		}
	}
}

var messagebox;
var aliases;

try{
	messagebox = require("./messagebox.json");
} catch(e) {
	//no stored messages
	messagebox = {};
}
try{
	aliases = require("./alias.json");
} catch(e) {
	//No aliases defined
	aliases = {};
}

function updateMessagebox(){
	fs.writeFile("./messagebox.json",JSON.stringify(messagebox,null,2), null);
}

function checkForMessages(bot, user) {
	try{
		if(messagebox.hasOwnProperty(user.id)){
			var message = messagebox[user.id];
			delete messagebox[user.id];
			updateMessagebox();
			bot.sendMessage(message.channel,message.content);
		}
	}catch(e){
		console.log(e);
	}
}

function isAdmin(id) {
	return (config.ADMIN_IDS.indexOf(id) > -1);
}

function makeAlias(args) {
	// Get rid of the command
	args.shift();
	var alias = args.shift();
	var output = args.join(" ");
	return {alias: alias, output: output};
}

function writeAliases() {
	fs.writeFile("./alias.json",JSON.stringify(aliases,null,2), null);
}

var commands = {
	"alias": {
		usage: "<command> <text to display>",
		adminOnly: true,
		help: "Creates a command alias -- e.g. !ping can output Pong!",
		process: function(args, bot, message) {
			var alias = makeAlias(args);
			if (alias.alias && alias.output) {
				var command = findCommand(alias.alias);
				if (command) {
					bot.sendMessage(message.channel, "Sorry, " + alias.alias + " is a command.");
				} else {
					aliases[alias.alias] = alias;
					//now save the new alias
					writeAliases();
					bot.sendMessage(message.channel,"Created alias " + alias.alias);
				}
			} else {
				displayUsage(bot, message, this);
			}
		}
	},
	"aliases": {
		help: "Lists the aliases available.",
		process: function(args, bot, message) {
			var output = "Aliases:";
			var hasAliases = false;
			var key;
			for (key in aliases) {
				output += "\n\t" + key + " -> " + aliases[key].output;
				hasAliases = true;
			}
			if (!hasAliases) {
				output += " None"
			}
			bot.sendMessage(message.channel, output);
		}
	},
	"clear_alias": {
		usage: "<alias>",
		adminOnly: true,
		help: "Deletes an alias.",
		process: function(args, bot, message) {
			var alias = makeAlias(args);
			if(alias.alias) {
				if (aliases[alias.alias]) {
					delete aliases[alias.alias];
					writeAliases();
					bot.sendMessage(message.channel, "Deleted alias " + alias.alias);
				} else {
					bot.sendMessage(message.channel, "Sorry, " + alias.alias + " doesn't exist.");
				}
			} else {
				displayUsage(bot, message, this);
			}
		}
	},
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
				output += "\n\t" + plugins[i].name;
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
        process: function(args, bot,msg) { 
        	var message = compileArgs(args);
        	if (message) {
        		bot.sendMessage(msg.channel,message);
        	} else {
				displayUsage(bot, message, this);
			}        	
        }
    },
	"announce": {
        usage: "<message>",
        help: "Bot says message with text to speech.",
        process: function(args, bot,msg) { 
        	var message = compileArgs(args);
        	if (message) {
        		bot.sendMessage(msg.channel,message,{tts:true});
        	} else {
				displayUsage(bot, message, this);
			}
        }
    },
    "userlist": {
    	help: "Returns a list of users on this server. This is useful for permissions.",
		adminOnly: true,
    	process: function(args,bot,msg) {
    		var output = "User list:";
    		var users = msg.channel.server.members;
    		for (var i = 0; i < users.length; i += 1) {
    			output += "\n    " + users[i].username + " [" + users[i].id + "]";
    		}
    		bot.sendMessage(msg.channel,output);
    	}
    },
    "adminlist": {
    	help: "Returns a list of admins for this bot.",
    	adminOnly: true,
    	process: function(args,bot,msg) {
    		var output = "Bot admin list:";
    		var users = msg.channel.server.members;
    		for (var i = 0; i < users.length; i += 1) {
    			if (isAdmin(users[i].id)) {
	    			output += "\n    " + users[i].username + " [" + users[i].id + "]";
		    	}
    		}
    		bot.sendMessage(msg.channel,output);
    	}
    },
    "isadmin": {
    	help: "Returns true if the sender is a bot admin",
    	process: function(args,bot,msg) { bot.sendMessage(msg.channel,isAdmin(msg.author.id).toString()); }
    },
    "userid": {
		usage: "<user to get id of, or blank for your own>",
		adminOnly: true,
		help: "Returns the unique id of a user. This is useful for permissions.",
		process: function(args,bot,msg) {
			var suffix = compileArgs(args);
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
		process: function(args,bot,msg) { bot.setChannelTopic(msg.channel,compileArgs(args)); }
	},
	"msg": {
		usage: "<user> <message to leave user>",
		help: "leaves a message for a user the next time they come online.",
		process: function(args,bot,msg) {
			// Ignore the command
			args.shift();
			var user = args.shift();
			if (user) {
				var message = args.join(' ');
				if (message) {
					console.log("Got a message: " + message);
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
					bot.sendMessage(msg.channel,"message saved.");
				} else {
					displayUsage(bot, msg, this);
				}
			} else {
				displayUsage(bot, msg, this);
			}			
		}
	},
	"uptime": {
		help: "returns the amount of time since the bot started.",
		process: function(args,bot,msg){
			var now = Date.now();
			var msec = now - startTime;
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
			var includeAdmin = isAdmin(message.author.id);
			var outputArray = [];
			var output = version + " commands:";
			output += "\nBuilt-in:";
			output += helpForCommands(commands, includeAdmin);
			var index = 0;
			outputArray[index++] = output;
			for (var i = 0; i < plugins.length; i++) {
				if (plugins[i].plugin.commands) {
					output = plugins[i].name + ":";
					output += helpForCommands(plugins[i].plugin.commands);
					outputArray[index++] = output;
				}
			}
			index = 0;
			async.forEachSeries(outputArray, function(output, callback) {
				var cb = callback;
				bot.sendMessage(message.channel, output, function(error, message) {
					if (error) {
						console.log(error);
					}
					cb();
				})
			}, function(err) {
				if (err) {
					console.log(err);
				}
			});
		}
	},
};

function helpForCommands(cmds, includeAdmin) {
	var output = "";
	var key;
	for (key in cmds) {
		var includeCommand = true;
		if (cmds[key].hasOwnProperty("adminOnly") && cmds[key].adminOnly && (includeAdmin == false)) {
			includeCommand = false;
		}
		if (includeCommand) {
			output += "\n\t!";
			output += key;
			var usage = cmds[key].usage;
			if(usage){
				output += " " + usage;
			}
			output += "\n\t\t\t";
			output += cmds[key].help;
		}
	}
	return output;
}

function findCommand(command) {
	var cmd = commands[command];
	if (cmd) {
		return cmd;
	}
	for (var i = 0; i < plugins.length; i++) {
		try {
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

function procCommand(bot, message) {
	if (message.author !== bot.user) {
		if (message.content.startsWith(config.COMMAND_PREFIX)) {
			var messageContent = message.content.substr(config.COMMAND_PREFIX.length);
			// First word is a command
			var args = messageContent.split(" ");
			var cmd = findCommand(args[0]);
			if(cmd) {
				if (cmd.hasOwnProperty("adminOnly") && cmd.adminOnly && !isAdmin(message.author.id)) {
					bot.sendMessage(message.channel, "Hey " + message.sender + ", you are not allowed to do that!");
				} else {
					try{
						cmd.process(args, bot, message);
					} catch(e){
						if(config.debug){
							bot.sendMessage(message.channel, "command " + message.content + " failed :(\n" + e.stack);
						}
					}
				}
			} else {
				cmd = aliases[args[0]];
				if (cmd) {
					bot.sendMessage(message.channel, cmd.output);
				} else if(config.respondToInvalid){
					bot.sendMessage(message.channel, "Invalid command " + message.content);
				}
			}
		} else if (message.author != bot.user && message.isMentioned(bot.user)) {
            bot.sendMessage(message.channel,message.author + ", you called?");
        }
        checkForMessages(bot, message.author);
	} 
}

function procPresence(bot, user, status, gameId) {
	try{
		if(status != 'offline'){
			checkForMessages(bot, user);
		}
	}catch(e){}
}

function startBot(bot, cfg) {
	config = cfg;

	version = config.NAME + " Version " + package_json.version;
	plugins = config.PLUGINS;

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
				plugins[i].plugin.setup(plugins[i].config, bot);			
			}
		} catch(e) {
			console.log("couldn't run setup for " + plugins[i].name + "!\n"+e.stack);
		}
	};
}

exports.commands = commands;
exports.plugins = plugins;
exports.startBot = startBot;
exports.procCommand = procCommand;
exports.procPresence = procPresence;