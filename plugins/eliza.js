'use strict';

var utils = require('../utils.js');
var elizabot = require('./elizabot.js');

var commands = {
	"eliza": {
		usage: "<anything - just talk>",
		help: "Let's talk...",
		process: function(args, bot, message) {
			if (!eliza) {
				eliza = new ElizaBot("./elizadata.js", false);
			}
			bot.sendMessage(message.channel, eliza.transform(utils.compileArgs(args)));
		}
	},
};

exports.findCommand = function(command) {
	return commands[command];
}

exports.commands = commands;

var eliza;