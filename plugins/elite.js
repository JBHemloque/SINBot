'use strict';

var utils = require('../utils.js');
var edsm = require('./edsmbot.js');
var fs = require("fs");
var alphanum = require("../alphanum.js");
var _ = require("underscore");

var regions = require("./elite/regions.json");
var regionjpg = require("./elite/regionjpg.js");

var botcfg = null;

function writeAliases() {
	fs.writeFile("./sysalias.json",JSON.stringify(edsm.aliases,null,2), null);
}

function writeCmdrAliases() {
	fs.writeFile("./cmdralias.json",JSON.stringify(edsm.cmdraliases,null,2), null);
}

function _calcJumpRange(jumpRange, distSagA, distMax) {
	var N = Math.floor(distMax / jumpRange);
	var M = N * jumpRange;
	return M - ((N/4) + (distSagA * 2));
}

function calcJumpRange(jumpRange, distSagA, distMax) {
	if ((!distMax) || (distMax > 1000.0)) {
		distMax = 1000.0;
	} 

	if (distSagA > 100.0) {
		// Assume we've mistakenly gotten a distance in ly, not kly
		distSagA /= 1000.0;
	}

	var estRange = _calcJumpRange(jumpRange, distSagA, distMax);
	if (estRange <= 0) {
		return "Error: Calculation resulted in a negative distance. Please check your input.";
	}
	if (distMax < 1000) {
		var maxRange = distMax;
		while(true) {
			distMax += jumpRange;
			var improvement = _calcJumpRange(jumpRange, distSagA, distMax);
			if (improvement > maxRange) {
				break;
			}
			estRange = improvement;
		}
	}
	var marginOfError = estRange * 0.0055;
	var output = "Estimated plot range should be around **";
	output += estRange.toFixed(2);
	output += "ly** - check range *";
	output += (estRange - marginOfError).toFixed(2);
	output += " to ";
	output += (estRange + marginOfError).toFixed(2);
	output += " ly*";
	return output;
}

function getRegionName(location) {
	var names = location.split(/ [a-z][a-z]-[a-z] /i);
	var key = names[0].toLowerCase();
	if (regions[key]) {
		return regions[key].region;
	}
	return undefined;
}

function getRegionMap(location, callback) {
	var region = getRegionName(location);
	if (region) {
		var key = region.toLowerCase();
		if (region) {
			regionjpg.fetchRegionMap(region.toLowerCase(), function() {
				callback(regions[key]);
			});
		} else {
			callback(undefined);
		}
	} else {
		callback(undefined);
	}		
}

function showRegion(args, bot, msg) {
	if (args.length > 1) {
		var region = utils.compileArgs(args);
		console.log("Looking for " + region);
		getRegionMap(region, function(data) {
			if (data) {
				if (data.map) {							
					bot.sendFile(msg.channel, "./plugins/elite/maps/" + data.map, data.map, "Region " + data.region);
					bot.sendMessage(msg.channel, "Region " + data.region);
				} else {
					bot.sendMessage(msg.channel, "Sorry, I have no map for region " + region);
				}
			} else {
				bot.sendMessage(msg.channel, "Sorry, I have no information on region " + region);
			}
		});
	} else {
		utils.displayUsage(bot,msg,this);
	}
}

var commands = {
	"region": {
		usage: "<region>",
		help: "Shows where a region is in the galaxy",
		process: showRegion
	},
	"show": {
		usage: "<region or system>",
		help: "Shows where a region or named system is in the galaxy",
		process: showRegion
	},
	"route": {
		usage: "<JumpRange> <SgrA distance in kly> [optional max plot in ly]",
		help: "Calculate optimal core routing distance.",
		process: function(args, bot, msg) {
			var displayUsage = true;
			if ((args.length === 4) || (args.length === 3)) {
				displayUsage = false;
				var jumpRange = parseFloat(args[1]);
				var distSagA = parseFloat(args[2]);
				var distMax = undefined;
				if (args.length === 4) {
					distMax = parseFloat(args[3]);
					if (distMax === NaN) {
						displayUsage = true;
					}
				}
				if ((jumpRange === NaN) || (distSagA === NaN)) {
					displayUsage = true;
				}
				if (!displayUsage) {
					bot.sendMessage(msg.channel, calcJumpRange(jumpRange, distSagA, distMax));
				}
			} 

			if (displayUsage) {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"showloc": {
		usage: "<name>",
		help: 'Shows the location of a commander.',
		extendedhelp: "Shows the location of a commander. We use information from EDSM to do this. In order to be findable, the commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public.",
		process: function(args,bot,msg) {
			if (args.length > 1) {
				edsm.getPositionString(utils.compileArgs(args), function(posString, position) {
					if (position) {
						getRegionMap(position, function(data) {
							if (data) {
								if (data.map) {
									bot.sendFile(msg.channel, "./plugins/elite/maps/" + data.map, data.map, posString);
									bot.sendMessage(msg.channel, posString);
								} else {
									bot.sendMessage(msg.channel, posString);
								}
							} else {
								bot.sendMessage(msg.channel, posString);
							}
						});
					} else {
						bot.sendMessage(msg.channel, posString);
					}				
				});
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
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
				query[0] = query[0].trim();
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
	"cmdralias": {
		usage: "<alias> -> <commander> [-> <optional expedition>]",
		adminOnly: true,
		help: "Creates a CMDR alias -- e.g. Falafel Expedition Leader can alias CMDR Falafel.",
		extendedhelp: "Creates or updates a CMDR alias -- e.g. Falafel Expedition Leader can alias CMDR Falafel -- with an optional expedition. This is useful simply as a convenience.",
		process: function(args, bot, msg) {
			var systems = utils.compileArgs(args).split("->");
			if (systems.length >= 2) {
				systems[0] = systems[0].trim();
				systems[1] = systems[1].trim();
				if ((systems[0].length > 0) && (systems[1].length > 0)) {
					var key = systems[0].toLowerCase();
					var output = "created CMDR alias from " + systems[0] + " -> " + systems[1];
					var cmdralias = {alias: systems[0], cmdr: systems[1]}; 
					var item = edsm.cmdraliases[key];
					// Optional expedition
					if (systems.length == 3) {
						systems[2] = systems[2].trim();
						cmdralias.expedition = systems[2];
						output += " for " + systems[2];
					}
					if (item) {
						_.extend(item, cmdralias);
					} else {
						item = cmdralias;
					}
					edsm.cmdraliases[key] = item;
					
					//now save the new alias
					writeCmdrAliases();
					bot.sendMessage(msg.channel,output);
				} else {
					utils.displayUsage(bot,msg,this);
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"show_cmdralias": {
		usage: "<alias>",
		help: "Displays a CMDR alias.",
		process: function(args, bot, message) {
			if (args.length > 1) {
				var alias = edsm.cmdraliases[args[1].toLowerCase()];
				var output = args[1] + " is not a CMDR alias.";
				if (alias) {
					output = alias.alias + " -> " + alias.cmdr;
					if (alias.expedition) {
						output += " for " + alias.expedition;
					} 
				}
				bot.sendMessage(message.channel, output);
			} else {
				displayUsage(bot, message, this);
			}		
		}
	},
	"clear_cmdralias": {
		usage: "<alias>",
		adminOnly: true,
		help: "Deletes a CMDR alias.",
		process: function(args, bot, message) {
			var alias = args[1].toLowerCase();
			if(alias) {
				if (edsm.cmdraliases[alias]) {
					delete edsm.cmdraliases[alias];
					writeCmdrAliases();
					bot.sendMessage(message.channel, "Deleted CMDR alias " + alias);
				} else {
					bot.sendMessage(message.channel, "Sorry, " + alias + " doesn't exist.");
				}
			} else {
				displayUsage(bot, message, this);
			}
		}
	},
	"cmdraliases": {
		help: "Returns the list of supported CMDR aliases.",
		process: function(args,bot,msg) {
			var key;
			var i = 0;
			var outputArray = [];
			outputArray[i++] = utils.bold("Supported CMDR aliases:");
			var hasAliases = false;
			for (key in edsm.cmdraliases) {
				var output = "\t";
				if (edsm.cmdraliases[key].expedition) {
					output += "[" + utils.italic(edsm.cmdraliases[key].expedition) + "] ";
				}
				output += edsm.cmdraliases[key].alias + " -> " + edsm.cmdraliases[key].cmdr;
				outputArray[i++] = output;
				hasAliases = true;
			}
			if (!hasAliases) {
				outputArray[0] += " None";
			}
			utils.sendMessages(bot,msg.channel,outputArray);
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
					var key = systems[0].toLowerCase();
					var output = "created system alias from " + systems[0] + " -> " + systems[1];
					var sysalias = {alias: systems[0], system: systems[1]};
					var item = edsm.aliases[key];
					// Optional expedition
					if (systems.length == 3) {
						systems[2] = systems[2].trim();
						sysalias.expedition = systems[2];
						output += " for " + systems[2];
					}
					if (item) {
						_.extend(item, sysalias);
					} else {
						item = sysalias;
					}
					edsm.aliases[key] = item;
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
	"show_sysalias": {
		usage: "<alias>",
		help: "Displays a system alias.",
		process: function(args, bot, message) {
			if (args.length > 1) {
				var system = utils.compileArgs(args);
				var output = system + " is not a system alias.";
				if (system) {
					var alias = edsm.aliases[system.toLowerCase()];
					if (alias) {
						output = alias.alias + " -> " + alias.system;
						if (alias.expedition) {
							output += " for " + alias.expedition;
						}
					}
				}
				bot.sendMessage(message.channel, output);
			} else {
				displayUsage(bot, message, this);
			}		
		}
	},
	"clear_sysalias": {
		usage: "<alias>",
		adminOnly: true,
		help: "Deletes a CMDR alias.",
		process: function(args, bot, message) {
			var system = utils.compileArgs(args);
			if(system) {
				if (edsm.aliases[system.toLowerCase()]) {
					delete edsm.aliases[system.toLowerCase()];
					writeAliases();
					bot.sendMessage(message.channel, "Deleted system alias " + system);
				} else {
					bot.sendMessage(message.channel, "Sorry, " + system + " doesn't exist.");
				}
			} else {
				displayUsage(bot, message, this);
			}
		}
	},
	"sysaliases": {
		help: "Returns the list of supported alias systems.",
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
			utils.sendMessages(bot,msg.channel,outputArray);
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
				// Aliases first, then cmdr aliases, then system aliases
				var key;
				var i = 0;
				var outputArray = [];
				var aliasArray = [];
				for (key in botcfg.aliases) {
					if (botcfg.aliases[key].expedition && botcfg.aliases[key].expedition.toLowerCase() === expedition.toLowerCase()) {
						aliasArray[i++] = "\t" + botcfg.aliases[key].alias + " -> " + utils.inBrief(botcfg.aliases[key].output);
					}
				}
				if (aliasArray.length > 0) {
					aliasArray.sort(alphanum.alphanumCase);
				}


				i = 0;
				var cmdrAliasArray = [];
				for (key in edsm.cmdraliases) {
					if (edsm.cmdraliases[key].expedition && edsm.cmdraliases[key].expedition.toLowerCase() === expedition.toLowerCase()) {
						cmdrAliasArray[i++] = "\t" + edsm.cmdraliases[key].alias + " -> " + edsm.cmdraliases[key].cmdr;
					}				
				}				
				if (cmdrAliasArray.length > 0) {
					cmdrAliasArray.sort(alphanum.alphanumCase);
				}
				

				i = 0;
				var sysaliasArray = [];
				for (key in edsm.aliases) {
					if (edsm.aliases[key].expedition && edsm.aliases[key].expedition.toLowerCase() === expedition.toLowerCase()) {
						sysaliasArray[i++] = "\t" + edsm.aliases[key].alias + " -> " + edsm.aliases[key].system;
					}				
				}
				if (sysaliasArray.length > 0) {
					sysaliasArray.sort(alphanum.alphanumCase);
				}

				if (aliasArray.length + cmdrAliasArray.length + sysaliasArray.length > 0) {
					i = 0;
					outputArray[i++] = utils.bold(expedition);
					if (aliasArray.length > 0) {
						outputArray[i++] = utils.bold("\nSupported aliases:");
						for (var key = 0; key < aliasArray.length; key++) {
							outputArray[i++] = aliasArray[key];
						}
					}

					if (cmdrAliasArray.length > 0) {
						outputArray[i++] = utils.bold("\nSupported CMDR aliases:");
						for (var key = 0; key < cmdrAliasArray.length; key++) {
							outputArray[i++] = cmdrAliasArray[key];
						}
					}

					if (sysaliasArray.length > 0) {
						outputArray[i++] = utils.bold("\nSupported stellar aliases:");
						for (var key = 0; key < sysaliasArray.length; key++) {
							outputArray[i++] = sysaliasArray[key];
						}
					}

					utils.sendMessages(bot,msg.channel,outputArray);
				} else {
					bot.sendMessage(msg.channel, expedtition + " is an empty expedition");
				}
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
			for (key in edsm.cmdraliases) {
				if (edsm.cmdraliases[key].expedition) { 
					expeditions[edsm.cmdraliases[key].expedition.toLowerCase()] = edsm.cmdraliases[key].expedition;
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
			utils.sendMessages(bot,msg.channel,outputArray);
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
	if (config) {
		if (config.regionfont) {
			regionjpg.setRegionFont(config.regionfont);
		}
	}	
}

exports.commands = commands;