'use strict';

var utils = require('../utils.js');
var edsm = require('./edsmbot.js');
var fs = require("fs");

var botcfg = null;

function writeAliases() {
	fs.writeFile("./sysalias.json",JSON.stringify(edsm.aliases,null,2), null);
}

var commands = {
	"loc": {
		usage: "<name>",
		help: 'Gets the location of a commander',
		process: function(args,bot,msg) {
			if (args.length > 1) {
				edsm.getPosition(utils.compileArgs(args), bot, msg);
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"syscoords": {
		usage: "<system>",
		help: 'Gets the galactic coordinates of a system',
		process: function(args,bot,msg) {
			if (args.length > 1) {
				edsm.getSystemCoords(utils.compileArgs(args), bot, msg);
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"cmdrcoords": {
		usage: "<name>",
		help: "Gets the locatinon of a commander, including system coordinates, if they are available",
		process: function(args,bot,msg) {
			if (args.length > 1) {
				edsm.getCmdrCoords(utils.compileArgs(args), bot, msg);
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"dist": {
		usage: "<first> -> <second>",
		help: "Gets the distance from one system or commander to another. If <second> is not given, gets the distance from first to Sol",
		process: function(args,bot,msg) {
			var query = utils.compileArgs(args).split("->");
			if (query.length <= 2) {
				if (query.length == 1) {
					query[1] = "Sol";
				} else {
					query[1] = query[1].trim();
				}
				if ((query[0].length > 0) && (query[1].length > 0)) {
					edsm.getDistance(query[0], query[1], bot, msg);
				} else {
					utils.displayUsage(bot,msg,this);
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}		
	},
	"sysalias": {
		usage: "<alias> -> <system> [-> <optional expedition>]",
		adminOnly: true,
		help: "Creates a system alias -- e.g. Beagle Point can alias CEECKIA ZQ-L C24-0",
		process: function(args, bot, msg) {
			var systems = utils.compileArgs(args).split("->");
			if (systems.length >= 2) {
				systems[0] = systems[0].trim();
				systems[1] = systems[1].trim();
				if ((systems[0].length > 0) && (systems[1].length > 0)) {
					var output = "created system alias from " + systems[0] + " -> " + systems[1];
					edsm.aliases[systems[0].toLowerCase()] = {alias: systems[0], system: systems[1]};
					// Optional expedition
					if (systems.length == 3) {
						systems[2] = systems[2].trim();
						edsm.aliases[systems[0].toLowerCase()].expedition = systems[2];
						output += " for " + systems[2];
					}
					//now save the new alias
					writeAliases();
					bot.sendMessage(msg.channel,output);
				} else {
					utils.displayUsage(bot,msg,this);
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"sysaliases": {
		help: "Returns the list of supported alias systems",
		process: function(args,bot,msg) {
			var key;
			var i = 0;
			var outputArray = [];
			outputArray[i++] = "Supported stellar aliases:";
			var hasAliases = false;
			for (key in edsm.aliases) {
				var output = "\t";
				if (edsm.aliases[key].expedition) {
					output += "[" + edsm.aliases[key].expedition + "] ";
				}
				output += edsm.aliases[key].alias + " -> " + edsm.aliases[key].system;
				outputArray[i++] = output;
				hasAliases = true;
			}
			if (!hasAliases) {
				outputArray[0] += " None";
			}
			utils.sendMessages(bot,msg,outputArray);
		}
	},
	"expsa": {
		usage: "<system alias> -> <expedition>",
		adminOnly: true,
		help: "Assigns a system alias to an expedition, allowing it to be grouped with the explist command.",
		process: function(args, bot, msg) {
			var query = utils.compileArgs(args).split("->");
			if (query.length == 2) {
				query[0] = query[0].trim();
				query[1] = query[1].trim();
				if ((query[0].length > 0) && (query[1].length > 0)) {
					if (edsm.aliases[query[0].toLowerCase()]) {
						edsm.aliases[query[0].toLowerCase()].expedition = query[1];
						writeAliases();
						bot.sendMessage(msg.channel, "Assigned " + query[0] + " to " + query[1]);					
					} else {
						bot.sendMessage(msg.channel, query[0] + " is not in my records.")
					}
				} else {
					utils.displayUsage(bot,msg,this);
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"expa": {
		usage: "<alias> -> <expedition>",
		adminOnly: true,
		help: "Assigns an alias to an expedition, allowing it to be grouped with the explist command.",
		process: function(args, bot, msg) {
			var query = utils.compileArgs(args).split("->");
			if (query.length == 2) {
				query[0] = query[0].trim();
				query[1] = query[1].trim();
				if ((query[0].length > 0) && (query[1].length > 0)) {
					if (botcfg.aliases[query[0].toLowerCase()]) {
						botcfg.aliases[query[0].toLowerCase()].expedition = query[1];
						botcfg.writeAliases();
						bot.sendMessage(msg.channel, "Assigned " + query[0] + " to " + query[1]);
					} else {
						bot.sendMessage(msg.channel, query[0] + " is not in my records.")
					}
				} else {
					utils.displayUsage(bot,msg,this);
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"explist": {
		usage: "<expedition>",
		help: "Lists everything associated with an expedition.",
		process: function(args, bot, msg) {
			if (args.length > 1) {
				var expedition = utils.compileArgs(args).trim();
				// Aliases first, then system aliases
				var key;
				var i = 0;
				var outputArray = [];
				var hasAliases = false;
				var aliasArray = [];
				for (key in botcfg.aliases) {
					if (botcfg.aliases[key].expedition && botcfg.aliases[key].expedition === expedition) {
						aliasArray[i++] = "\t" + botcfg.aliases[key].alias;
						hasAliases = true;
					}
				}
				if (!hasAliases) {
					aliasArray[i] += " None";
				}
				aliasArray.sort();

				hasAliases = false;
				i = 0;
				var sysaliasArray = [];
				for (key in edsm.aliases) {
					if (edsm.aliases[key].expedition && edsm.aliases[key].expedition === expedition) {
						sysaliasArray[i++] = "\t" + edsm.aliases[key].alias + " -> " + edsm.aliases[key].system;
						hasAliases = true;
					}				
				}
				if (!hasAliases) {
					sysaliasArray[i] += " None";
				}
				sysaliasArray.sort();

				i = 0;
				outputArray[i++] = expedition;
				outputArray[i++] = "Supported aliases:";
				for (var key = 0; key < aliasArray.length; key++) {
					outputArray[i++] = aliasArray[key];
				}

				outputArray[i++] = "Supported stellar aliases:";
				for (var key = 0; key < sysaliasArray.length; key++) {
					outputArray[i++] = sysaliasArray[key];
				}

				utils.sendMessages(bot,msg,outputArray);
			} else {
				utils.displayUsage(bot,msg,this);
			}	
		}
	},
	"expeditions": {
		help: "Lists active expeditions.",
		process: function(args, bot, msg) {
			var key;
			var i = 0;
			var outputArray = [];
			var expeditions = [];
			for (key in botcfg.aliases) {
				if (botcfg.aliases[key].expedition) {
					expeditions[botcfg.aliases[key].expedition] = botcfg.aliases[key].expedition;
				}
			}
			for (key in edsm.aliases) {
				if (edsm.aliases[key].expedition) { 
					expeditions[edsm.aliases[key].expedition] = edsm.aliases[key].expedition;
				}
			}
			// Generate a sorted array here
			var explist = [];
			for (key in expeditions) {
				explist[i++] = expeditions[key];
			}
			explist.sort();
			i = 0;
			outputArray[i++] = "Active expeditions:";
			var hasExpeditions = false;
			for (var key = 0; key < explist.length; key++) {
				outputArray[i++] = "\t" + explist[key];
				hasExpeditions = true;
			}
			if(!hasExpeditions) {
				outputArray[0] += " None";
			}
			utils.sendMessages(bot,msg,outputArray);
		}
	}
};

exports.findCommand = function(command) {
	return commands[command];
}

exports.setup = function(config, bot, botconfig) {
	botcfg = botconfig;
	// For dependency injection
	if (botconfig.edsm) {
		edsm = botconfig.edsm;
	}
}

exports.commands = commands;