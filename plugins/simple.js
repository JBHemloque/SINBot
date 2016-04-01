'use strict';

var utils = require('../utils.js');

var commands = {
	"pat": {
		usage: "<name>",
		help: "Rough day? Comfort someone with this command.",
		process: function(args, bot, message) { 
			bot.sendMessage(message.channel, "There, there, " + utils.compileArgs(args)); 
		}
	},
};

exports.commands = commands;

exports.findCommand = function(command) {
	return commands[command];
}