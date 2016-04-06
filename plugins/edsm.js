'use strict';

var utils = require('../utils.js');
var edsm = require('./edsmbot.js');
var fs = require("fs");
var alphanum = require("../alphanum.js");

var botcfg = null;

function writeAliases() {
	fs.writeFile("./sysalias.json",JSON.stringify(edsm.aliases,null,2), null);
}

var commands = {
	"loc": {
		usage: "<name>",
		help: 'Gets the location of a commander.',
		extendedhelp: "Gets the location of a commander. We use information from EDSM to do this. In order to be findable, the commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public.",
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
		help: 'Gets the galactic coordinates of a system.',
		extendedhelp: "Gets the galactic coordinates of a system. We use information from EDSM to do this. The system must have coordinates in EDSM. Applications such as EDDiscovery make this easy to do.",
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
		help: "Gets the location of a commander, including system coordinates, if they are available.",
		extendedhelp: "Gets the location of a commander, including system coordinates. We use information from EDSM to do this. In order to be findable, the commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public. In addition, the system they are in must have coordinates in EDSM. Applications such as EDDiscovery make this easy to do.",
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
		help: "Gets the distance from one system or commander to another. If <second> is not given, gets the distance from first to Sol.",
		extendedhelp: "Gets the distance from one system or commander to another. If <second> is not given, gets the distance from first to Sol. We use information from EDSM to do this. In order to be findable, a commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public. In addition, the system they are in must have coordinates in EDSM. Likewise, for distance calculations, a system must have coordinates in EDSM. Applications such as EDDiscovery make this easy to do.",
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
		help: "Creates a system alias -- e.g. Beagle Point can alias CEECKIA ZQ-L C24-0.",
		extendedhelp: "Creates a system alias -- e.g. Beagle Point can alias CEECKIA ZQ-L C24-0 -- with an optional expedition. This is useful simply as a convenience. Many systems have several accepted designations (like Beagle Point, for instance, or RR Lyrae, which is another designation for HIP 95497).",
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
			outputArray[i++] = utils.bold("Supported stellar aliases:");
			var hasAliases = false;
			for (key in edsm.aliases) {
				var output = "\t";
				if (edsm.aliases[key].expedition) {
					output += "[" + utils.italic(edsm.aliases[key].expedition) + "] ";
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
		usage: "<alias> -> <expedition>[ -> <optional alias>]",
		adminOnly: true,
		help: "Assigns an alias to an expedition, allowing it to be grouped with the explist command.",
		extendedhelp: "Assigns an alias to an expedition, allowing it to be grouped with the explist command. You can optionally include the full alias, allowing you to easily edit an alias attached to an expedition without having to reassign it to the expedition in another step.",
		process: function(args, bot, msg) {
			var query = utils.compileArgs(args).split("->");
			if (query.length >= 2) {
				query[0] = query[0].trim();
				query[1] = query[1].trim();
				if ((query[0].length > 0) && (query[1].length > 0)) {
					// If there is a third arg, then go through the full create-alias path:
					if (query.length == 3) {
						var alias = botcfg.makeAlias(query[0], query[2].trim(), function(alias) {
							alias.expedition = query[1];
						});
						if (alias.displayUsage) {
							displayUsage(bot, msg, this);
						} else if (alias.error) {
							bot.sendMessage(msg.channel, alias.message);
						} else {
							bot.sendMessage(msg.channel,"Created alias " + alias.alias + " in expedition " + query[1]);
						}
					} else {
						if (botcfg.aliases[query[0].toLowerCase()]) {
							botcfg.aliases[query[0].toLowerCase()].expedition = query[1];
							botcfg.writeAliases();
							bot.sendMessage(msg.channel, "Assigned " + query[0] + " to " + query[1]);
						} else {
							bot.sendMessage(msg.channel, query[0] + " is not in my records.")
						}
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
					if (botcfg.aliases[key].expedition && botcfg.aliases[key].expedition.toLowerCase() === expedition.toLowerCase()) {
						aliasArray[i++] = "\t" + botcfg.aliases[key].alias + " -> " + utils.inBrief(botcfg.aliases[key].output);
						hasAliases = true;
					}
				}
				if (!hasAliases) {
					aliasArray[i] += " None";
				}
				aliasArray.sort(alphanum.alphanumCase);

				hasAliases = false;
				i = 0;
				var sysaliasArray = [];
				for (key in edsm.aliases) {
					if (edsm.aliases[key].expedition && edsm.aliases[key].expedition.toLowerCase() === expedition.toLowerCase()) {
						sysaliasArray[i++] = "\t" + edsm.aliases[key].alias + " -> " + edsm.aliases[key].system;
						hasAliases = true;
					}				
				}
				if (!hasAliases) {
					sysaliasArray[i] += " None";
				}
				sysaliasArray.sort(alphanum.alphanumCase);

				i = 0;
				outputArray[i++] = utils.bold(expedition);
				outputArray[i++] = utils.bold("\nSupported aliases:");
				for (var key = 0; key < aliasArray.length; key++) {
					outputArray[i++] = aliasArray[key];
				}

				outputArray[i++] = utils.bold("\nSupported stellar aliases:");
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
					expeditions[botcfg.aliases[key].expedition.toLowerCase()] = botcfg.aliases[key].expedition;
				}
			}
			for (key in edsm.aliases) {
				if (edsm.aliases[key].expedition) { 
					expeditions[edsm.aliases[key].expedition.toLowerCase()] = edsm.aliases[key].expedition;
				}
			}
			// Generate a sorted array here
			var explist = [];
			for (key in expeditions) {
				if (typeof expeditions[key] != 'function') {
					explist[i++] = expeditions[key];
				}
			}
			explist.sort(alphanum.alphanumCase);
			i = 0;
			outputArray[i++] = utils.bold("Active expeditions:");
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