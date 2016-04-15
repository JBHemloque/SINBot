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

function debugLog(message) {
	if (config.DEBUG) {
		console.log(message);
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
			var outputArray = [];
			if (message.content) {
				outputArray.push(message.content);
			} else {
				for (var i = 0; i < message.length; i++) {
					outputArray.push(message[i].content);
				}
			}
			utils.sendMessages(bot, user, outputArray);
			delete messagebox[user.id];
			updateMessagebox();
		}
	}catch(e){
		utils.logError("Error reading messagebox", e);
		throw e;
	}
}

function addMessage(targetId, message) {
	var msg = messagebox[targetId];
	if (msg) {
		// Ensure it's a new-style message
		if (msg.content) {
			// Old style message... Turn it into an array
			var msgArray = [];
			msgArray.push(msg);
			msg = msgArray;
		}
	} else {
		msg = [];
	}
	msg.push(message);
	messagebox[targetId] = msg;
	updateMessagebox();
}

function isAdmin(id) {
	return (config.ADMIN_IDS.indexOf(id) > -1);
}

function makeAliasStruct(alias, output) {
	return {alias: alias, output: output};
}

function makeAliasStructFromArgs(args) {
	// Get rid of the command
	args.shift();
	var alias = args.shift();
	var output = args.join(" ");
	return makeAliasStruct(alias, output);
}

function writeAliases() {
	fs.writeFile("./alias.json",JSON.stringify(aliases,null,2), null);
}

function makeAliasFromArgs(args, addExtrasCallback) {
	// Get rid of the command
	args.shift();
	var alias = args.shift();
	var output = args.join(" ");
	return makeAlias(alias, output, addExtrasCallback);
}

function makeAlias(alias, output, addExtrasCallback) {
	var aliasStruct = makeAliasStruct(alias, output);
	if (aliasStruct.alias && aliasStruct.output) {
		var command = findCommand(aliasStruct.alias);
		if (command) {
			return {error: true, message: "Sorry, " + aliasStruct.alias + " is a command."};
		} else {
			if (addExtrasCallback) {
				addExtrasCallback(aliasStruct);
			}
			aliases[aliasStruct.alias.toLowerCase()] = aliasStruct;
			//now save the new alias
			writeAliases();
			return aliasStruct;
		}
	} else {
		return {displayUsage: true};
	}
}

var commands = {
	"alias": {
		usage: "<alias> <text to display>",
		adminOnly: true,
		help: "Creates a command alias -- e.g. !ping can output Pong!",
		extendedhelp: "An alias is a simple text substitution. It creates a command that sends some text when that command is entered. You can include the name of the person who sent the alias command with %SENDER%, the name of the channel with %CHANNEL%, the name of the server with %SERVER%, and the channel topic with %CHANNEL_TOPIC%. Commands can be one word, and additional lines inserted into the output with %EXTRA%",
		process: function(args, bot, message) {
			var alias = makeAliasFromArgs(args);
			if (alias.displayUsage) {
				displayUsage(bot, message, this);
			} else if (alias.error) {
				bot.sendMessage(message.channel, alias.message);
			} else {
				bot.sendMessage(message.channel,"Created alias " + alias.alias);
			}
		}
	},
	"show_alias": {
		usage: "<alias>",
		help: "Displays an alias.",
		extendedhelp: "An alias is a simple text substitution. It creates a command that sends some text when that command is entered. You can include the name of the person who sent the alias command with %SENDER%, the name of the channel with %CHANNEL%, the name of the server with %SERVER%, and the channel topic with %CHANNEL_TOPIC%. Commands can be one word, and additional lines inserted into the output with %EXTRA%. This command shows the contents of an alias.",
		process: function(args, bot, message) {
			if (args.length > 1) {
				var alias = aliases[args[1].toLowerCase()];
				var output = args[1] + " is not an alias.";
				if (alias) {
					output = alias.alias + " -> " + alias.output; 
				}
				bot.sendMessage(message.channel, output);
			} else {
				displayUsage(bot, message, this);
			}		
		}
	},
	"aliases": {
		help: "Lists the aliases available.",
		process: function(args, bot, message) {
			var i = 0;
			var outputArray = [];
			outputArray[i++] = "Aliases:";
			var hasAliases = false;
			var key;
			for (key in aliases) {
				outputArray[i++] = "\t" + key + " -> " + utils.inBrief(aliases[key].output);
				hasAliases = true;
			}
			if (!hasAliases) {
				outputArray[0] += " None"
			}
			utils.sendMessages(bot, message.channel, outputArray);
		}
	},
	"clear_alias": {
		usage: "<alias>",
		adminOnly: true,
		help: "Deletes an alias.",
		process: function(args, bot, message) {
			var alias = makeAliasStructFromArgs(args);
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
    "disconnect": {
    	help: "Disconnects the bot from the server. It will immediately try to reconnect.",
    	adminOnly: true,
    	process: function(args, bot, msg) {
    		bot.sendMessage(msg.channel, version + " is going down NOW!");
    		bot.logout(function(err) {
    			bot.sendMessage(msg.channel, "Error disconnecting: " + err);
    		});
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
					if(user.startsWith('<@')){
						user = user.substr(2,user.length-3);
					}
					var target = msg.channel.server.members.get("id",user);
					if(!target){
						target = msg.channel.server.members.get("username",user);
					}
					var msgtext = target + ", " + msg.author + " left you a message";
					if (msg.timestamp) {
						msgtext += " at " + new Date(msg.timestamp).toUTCString();
					}
					msgtext += (":\n" + message);
					var message = {
						channel: msg.channel.id,
						content: msgtext
					};					
					addMessage(target.id, message);
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
		usage: "[<command>]",
		help: "Display help for this bot, or for specific commands, or plugins",
		process: function(args, bot, message) {
			var command = compileArgs(args).toLowerCase();
			if (command) {
				var output = command + " is not a valid command or plugin";
				var cmd = findCommand(command);				
				if (cmd) {
					output = utils.bold(command);
					if (cmd.usage) {
						output += ("\t" + utils.italic(cmd.usage));
					}
					if (cmd.extendedhelp) {
						output += ("\n\n" + cmd.extendedhelp);
					} else {
						output += ("\n\n" + cmd.help);
					}
				} else if (command === "built-in") {
					output = helpForCommands(version + " commands:\nBuilt-in", commands, includeAdmin);
				} else {
					for (var i = 0; i < plugins.length; i++) {
						if (plugins[i].name.toLowerCase() === command) {
							output = helpForCommands(plugins[i].name, plugins[i].plugin.commands);
						}
					}
				}
				bot.sendMessage(message.channel, output);
			} else {
				var includeAdmin = isAdmin(message.author.id);
				var outputArray = [];
				var index = 0;
				outputArray[index++] = helpForCommands(version + " commands:\nBuilt-in", commands, includeAdmin);
				for (var i = 0; i < plugins.length; i++) {
					if (plugins[i].plugin.commands) {
						outputArray[index++] = helpForCommands(plugins[i].name, plugins[i].plugin.commands);
					}
				}
				utils.sendMessages(bot, message.channel, outputArray);
			}			
		}
	},
};

function dumpMessages(messageArray) {
	console.log("Dumping message array:");
	for (var i = 0; i < messageArray.length; i++) {
		console.log("Message " + i + " (is a " + typeof messageArray[i] + "):");
		console.log(messageArray[i]);
	}
}

function helpForCommands(header, cmds, includeAdmin) {
	var output = utils.bold(header) + ":";
	var key;
	for (key in cmds) {
		var includeCommand = true;
		var cmd = cmds[key.toLowerCase()];
		if (cmd.hasOwnProperty("adminOnly") && cmd.adminOnly && (includeAdmin == false)) {
			includeCommand = false;
		}
		if (includeCommand) {
			output += "\n\t";
			if (config.COMMAND_PREFIX) {
				output += config.COMMAND_PREFIX;
			}
			output += utils.bold(key);
			if(cmd.usage){
				output += " " + utils.italic(cmd.usage);
			}
			output += "\n\t\t\t";
			output += cmds[key.toLowerCase()].help;
		}
	}
	return output;
}

function findCommand(command) {
	if (command) {
		command = command.toLowerCase();
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
				utils.logError("Couldn't call findCommand() on plugin " + plugins[i].name, e);
			}	
		}
	}	
	return null;
}

function botShouldHandleCommand(bot, message) {
	// If there's a command prefix, use that. Otherwise, only do this if the message
	// starts with a mention of the bot.
	var result = {handleCommand: false};
	var messageContent = message.content;
	var stripFirstArg = false;
	if (config.COMMAND_PREFIX) {		
		if (message.content.startsWith(config.COMMAND_PREFIX)) {
			result.handleCommand = true;
			messageContent = message.content.substr(config.COMMAND_PREFIX.length);
		}
	} else if (message.content.startsWith("<@" + bot.user.id + ">")) {
		stripFirstArg = true;
		result.handleCommand = true;
	} else if (message.channel.isPrivate) {
		stripFirstArg = false;
		result.handleCommand = true;
	}
	if (result.handleCommand) {
		var args = messageContent.split(" ");
		if (stripFirstArg) {
			args.shift();
		}
		if (args) {
			result.args = args;
		} else {
			result.handleCommand = false;
		}
	}
	return result;
}

var defaultCommandHandler = function(args, bot, message) {
	if(config.respondToInvalid){
		bot.sendMessage(message.channel, "Invalid command " + message.content);
	} 
}

var procAlias = function(bot, message, cmd, extra) {
	// Do substitutions
	// %SENDER%, %CHANNEL%, %SERVER%, %CHANNEL_TOPIC%,%EXTRA%
	var output = cmd.output;
	output = output.replace(/%SENDER%/gi, message.author);
	output = output.replace(/%CHANNEL%/gi, message.channel);
	output = output.replace(/%SERVER%/gi, message.server);
	output = output.replace(/%CHANNEL_TOPIC%/gi, message.channel.topic);
	output = output.replace(/%EXTRA%/gi, extra);
	bot.sendMessage(message.channel, output);
}

function procCommand(bot, message) {
	debugLog(message.author.name + ": " + message.content);
	if (message.author !== bot.user) {
		var res = botShouldHandleCommand(bot, message);
		if (res.handleCommand) {
			var cmd = findCommand(res.args[0]);
			if(cmd) {
				if (cmd.hasOwnProperty("adminOnly") && cmd.adminOnly && !isAdmin(message.author.id)) {
					bot.sendMessage(message.channel, "Hey " + message.sender + ", you are not allowed to do that!");
				} else {
					try{
						cmd.process(res.args, bot, message);
					} catch(e){
						if(config.debug){
							bot.sendMessage(message.channel, "command " + message.content + " failed :(\n" + e.stack);
						}
					}
				}
			} else {
				cmd = aliases[res.args[0].toLowerCase()];
				if (cmd) {
					procAlias(bot, message, cmd, compileArgs(res.args));
				} else {
					defaultCommandHandler(res.args, bot, message);
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

	var botcfg = {
		aliases: aliases,
		writeAliases: writeAliases,
		makeAlias: makeAlias
	};

	if (config.COMMAND_PREFIX) {
		debugLog("Command prefix: " + config.COMMAND_PREFIX);
	} else {
		debugLog("Starting in direct-mention mode...");
	}

	for (var i = 0; i < plugins.length; i += 1) {
		try {
			plugins[i].plugin = require(plugins[i].path);

			debugLog("Loaded plugin " + plugins[i].name);
		} catch(e) {
			utils.logError("Couldn't load " + plugins[i].name, e);
			if (config.DEBUG) {
				throw e;
			}
		}
		try {
			if (plugins[i].plugin.setup) {
				debugLog("Running setup for " + plugins[i].name);
				plugins[i].plugin.setup(plugins[i].config, bot, botcfg);			
			}
		} catch(e) {
			utils.logError("Couldn't run setup for " + plugins[i].name, e);
			if (config.DEBUG) {
				throw e;
			}
		}
		try {
			if (plugins[i].defaultCommandHandler) {
				var dch = plugins[i].plugin.findCommand(plugins[i].defaultCommandHandler);
				if (dch) {
					debugLog("Setting default command handler to " + plugins[i].defaultCommandHandler);
					defaultCommandHandler = dch.process;
				}
			}
		} catch (e) {
			utils.logError("Couldn't set default command handler for " + plugins[i].name, e);
			if (config.DEBUG) {
				throw e;
			}
		}
	};
}

exports.commands = commands;
exports.plugins = plugins;
exports.startBot = startBot;
exports.procCommand = procCommand;
exports.procPresence = procPresence;
exports.aliases = aliases;
exports.makeAlias = makeAlias;
exports.writeAliases = writeAliases;