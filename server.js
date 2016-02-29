var Discord = require("discord.js");
var dice = require('./dice.js');
var search = require('./search.js');
var config = require('./config.js');

const VERSION = "SINBot Version 0.3.1";

var SINBot = new Discord.Client();

var compileArgs = function(args) {
	args.splice(0,1);
	return args.join(" ");
}

var genCommand = function(fcnName, fcnHelp, fcnFunction) {
	return {
		name: fcnName,
		help: fcnHelp,
		func: fcnFunction
	};
}

var simpleCommands = {}
simpleCommands["!pat"] = genCommand("pat [name]", "Rough day? Comfort someone with this command.",
	function(args, callback) { callback("There, there, " + compileArgs(args)); });
simpleCommands["!roll"] = genCommand("roll [dice]", "Dice rolling command. Supports standard dice notation, including F-5/Fudge dice (e.g.: 4dF+2).",
	function(args, callback) { callback(dice.rollDice(compileArgs(args))); });
simpleCommands["!version"] = genCommand("version", "Display version information for this bot.", 
	function(args, callback) { callback(VERSION); });
simpleCommands["!help"] = genCommand("help", "Display help for this bot.", 
	function(arg, callback) {
		var output = "SINBot commands:";
		var key;
		for (key in simpleCommands) {
			output += "\n\t!";
			output += simpleCommands[key].name;
			output += "\n\t\t\t";
			output += simpleCommands[key].help;
		}
		for (key in complexCommands) {
			output += "\n\t!";
			output += complexCommands[key].name;
			output += "\n\t\t\t";
			output += complexCommands[key].help;
		}
		callback(output);
	});

var complexCommands = {}
complexCommands["!precis"] = genCommand("precis [name]", "Generate a precis on someone.",
	function(args, bot, message) { search.precis(compileArgs(args), bot, message); });


SINBot.on("message", function(message){
	if (message.author !== SINBot.user) {
		console.log("[" + SINBot.user + "] Got message from " + message.author + ": " + message);
		if (message.content.startsWith("!")) {
			// First word is a command
			var args = message.content.split(" ");
			var command = simpleCommands[args[0]];
			if (command) {
				command.func(args, function(resp) {
					SINBot.sendMessage(message.channel, resp);
				});
			} else {
				command = complexCommands[args[0]];
				if (command) {
					command.func(args, SINBot, message);			
				}
			}
		}
	} 
});

SINBot.login(config.LOGIN, config.PASSWORD, function(error, token) {
	if (error) {
		console.log("Error logging in: " + error);
	}
	if (token) {
		console.log(VERSION + " logged in with token " + token);
	}
});