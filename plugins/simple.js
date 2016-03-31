'use strict';

var utils = require('../utils.js');

var commands = {
	"coffee": {
		help: "We all want it. We all need it",
		process: function(args, bot, message) { bot.sendMessage(message.channel, "Oh, God, yes..."); }
	},
	"drpepper": {
		help: "Venus wants it. Venus needs it",
		process: function(args, bot, message) { bot.sendMessage(message.channel, "Yum!"); }
	},
	"chortle": {
		help: "Make 'em laugh...",
		process: function(args, bot, message) { bot.sendMessage(message.channel, "*chortle*!"); }
	},
	"pat": {
		usage: "<name>",
		help: "Rough day? Comfort someone with this command.",
		process: function(args, bot, message) { 
			bot.sendMessage(message.channel, "There, there, " + utils.compileArgs(args)); 
		}
	},
};

exports.findCommand = function(command) {
	return commands[command];
}