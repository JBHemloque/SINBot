'use strict';

var utils = require('../utils.js');
var jaquesbot = require('./jaquesbot.js');

var commands = {
	"jaquesstart": {
		help: "Jaques is your cyborg bartender. Have a drink!",
		process: function(args, bot, message) { startjaques(args, bot, message); }
	},
	"jaquesbye": {
		help: "It's closing time, you can't drink here...",
		process: function(args, bot, message) { endjaques(args, bot, message); }
	},
	"jaques": {
		usage: "<anything - just talk>",
		help: "I'm Jaques, your cyborg bartender. Let's talk...",
		process: function(args, bot, message) {
			if (!jaquesStarted) {
				startjaques(args, bot, message);
			}
			bot.sendMessage(message.channel, jaquesbot.reply(utils.compileArgs(args)));
		}
	},
};

exports.findCommand = function(command) {
	return commands[command];
}

exports.commands = commands;

var jaquesStarted = false;

var startjaques = function(args, bot, message) {
	if (jaquesStarted) {
		bot.sendMessage(message.channel, jaquesbot.bye());
	}
	bot.sendMessage(message.channel, jaquesbot.start());
	jaquesStarted = true;
}

var endjaques = function(args, bot, message) {
	bot.sendMessage(message.channel, jaquesbot.bye());
	jaquesStarted = false;
}