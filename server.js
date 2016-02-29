var Discord = require("discord.js");
var dice = require('./dice.js');
var search = require('./search.js');
var config = require('./config.js');

const VERSION = "SINBot Version 0.1.0";

var SINBot = new Discord.Client();

var compileArgs = function(args) {
	args.splice(0,1);
	return args.join(" ");
}

var simpleCommands = {}
simpleCommands["!pat"] = function(args, callback) { callback("There, there, " + compileArgs(args)); }
simpleCommands["!roll"] = function(args, callback) { callback(dice.rollDice(compileArgs(args))); }
simpleCommands["!version"] = function(args, callback) { callback(VERSION); }

var complexCommands = {}
complexCommands["!precis"] = function(args, bot, message) { search.precis(compileArgs(args), bot, message); }


SINBot.on("message", function(message){
	if (message.author !== SINBot.user) {
		console.log("[" + SINBot.user + "] Got message from " + message.author + ": " + message);
		if (message.content.startsWith("!")) {
			// First word is a command
			var args = message.content.split(" ");
			var command = simpleCommands[args[0]];
			if (command) {
				command(args, function(resp) {
					SINBot.sendMessage(message.channel, resp);
				});
			} else {
				command = complexCommands[args[0]];
				if (command) {
					command(args, SINBot, message);			
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