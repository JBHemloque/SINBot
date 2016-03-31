'use strict';

var utils = require('../utils.js');
var edsm = require('./edsmbot.js');

var commands = {
	"loc": {
		usage: "<name>",
		help: 'Gets the location of a commander',
		process: function(args,bot,msg) {
			var commander = utils.compileArgs(args);
			console.log("loc " + commander);
			edsm.getPosition(commander, bot, msg);
		}
	},
	"syscoords": {
		usage: "<system>",
		help: 'Gets the galactic coordinates of a system',
		process: function(args,bot,msg) {
			edsm.getSystemCoords(utils.compileArgs(args), bot, msg);
		}
	},
	"cmdrcoords": {
		usage: "<name>",
		help: "Gets the locatinon of a commander, including system coordinates, if they are available",
		process: function(args,bot,msg) {
			edsm.getCmdrCoords(utils.compileArgs(args), bot, msg);
		}
	},
	"dist": {
		usage: "<first> -> <second>",
		help: "Gets the distance from one system or commander to another. If <second> is not given, gets the distance from first to Sol",
		process: function(args,bot,msg) {
			var query = utils.compileArgs(args).split("->");
			var first = query[0].trim();
			var second = null;
			if (query.length == 1) {
				second = "Sol";
			} else {
				second = query[1].trim();
			}
			edsm.getDistance(first, second, bot, msg);
		}		
	},
	"sysaliases": {
		help: "Returns the list of supported alias systems",
		process: function(args,bot,msg) {
			var key;
			var output = "Supported stellar aliases:";
			for (key in edsm.aliases) {
				if (typeof edsm.aliases[key] != 'function') {
					output += "\n    *" + key + " -> " + edsm.aliases[key];
				}
			}
			bot.sendMessage(msg.channel, output);
		}
	},
};

exports.findCommand = function(command) {
	return commands[command];
}

exports.commands = commands;