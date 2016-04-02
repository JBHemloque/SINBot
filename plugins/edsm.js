'use strict';

var utils = require('../utils.js');
var edsm = require('./edsmbot.js');
var fs = require("fs");

var commands = {
	"loc": {
		usage: "<name>",
		help: 'Gets the location of a commander',
		process: function(args,bot,msg) {
			edsm.getPosition(utils.compileArgs(args), bot, msg);
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
	"sysalias": {
		usage: "<alias> -> <system>",
		adminOnly: true,
		help: "Creates a system alias -- e.g. Beagle Point can alias CEECKIA ZQ-L C24-0",
		process: function(args, bot, message) {
			var systems = utils.compileArgs(args).split("->");
			var alias = systems[0].trim();
			var system = systems[1].trim();
			edsm.aliases[alias.toLowerCase()] = {alias: alias, system: system};
			//now save the new alias
			fs.writeFile("./sysalias.json",JSON.stringify(edsm.aliases,null,2), null);
			bot.sendMessage(message.channel,"created system alias from " + alias + " -> " + system);
		}
	},
	"sysaliases": {
		help: "Returns the list of supported alias systems",
		process: function(args,bot,msg) {
			var key;
			var output = "Supported stellar aliases:";
			var hasAliases = false;
			for (key in edsm.aliases) {
				output += "\n\t" + edsm.aliases[key].alias + " -> " + edsm.aliases[key].system;
				hasAliases = true;
			}
			if (!hasAliases) {
				output += " None";
			}
			bot.sendMessage(msg.channel, output);
		}
	},
};

exports.findCommand = function(command) {
	return commands[command];
}

exports.commands = commands;