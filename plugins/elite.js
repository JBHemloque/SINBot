'use strict';

var utils = require('../utils.js');
var edsm = require('./edsm.js');
var fs = require("fs");
var alphanum = require("../alphanum.js");
var _ = require("underscore");
var request = require('request');

var regions = require("./elite/regions.json");
var regionjpg = require("./elite/regionjpg.js");

var botcfg = null;
var pmIfSpam = false;

var NEW_THRESHHOLD = (7 * 24 * 60 * 60 * 1000);

var densitySigmaArray = [ // in SI units of kg/m^3
        {likelyType: "IW", densities: [1.06e+3, 1.84e+3, 2.62e+3, 3.40e+3]},
        {likelyType: "RIW", densities: [2.25e+3, 2.82e+3, 3.38e+3, 3.95e+3]},
        {likelyType: "RW", densities: [2.94e+3, 3.77e+3, 4.60e+3, 5.43e+3]},
        {likelyType: "HMC", densities: [1.21e+3, 4.60e+3, 8.00e+3, 1.14e+4]},
        {likelyType: "MR", densities: [1.47e+3, 7.99e+3, 1.45e+4, 2.10e+4]},
        {likelyType: "WW", densities: [1.51e+3, 4.24e+3, 6.97e+3, 9.70e+3]},
        {likelyType: "ELW", densities: [4.87e+3, 5.65e+3, 6.43e+3, 7.21e+3]},
        {likelyType: "AW", densities: [4.23e+2, 3.50e+3, 6.59e+3, 9.67e+3]}
];

function handleGravity(planetMass, planetRadius) {
	var G = 6.67e-11;
	var earthMass = 5.98e24;
	var earthRadius = 6367444.7;
	var baseG = G * earthMass / (earthRadius * earthRadius);
	var planetG = G * planetMass * earthMass / (planetRadius * planetRadius * 1e6);
	var planetDensity = planetMass * earthMass / (4.0 / 3.0 * Math.PI * planetRadius * planetRadius * planetRadius) * 1e-9; // in SI units of kg/m^3
	var planetM2Str = planetG.toFixed(2);
	var planetGStr = (planetG / baseG).toFixed(2);
	var planetDensityStr = planetDensity.toExponential(2);
	var maybeTypes = [];
	var likelyTypes = [];

	for (var i = 0; i < densitySigmaArray.length; i++) {
		var row = densitySigmaArray[i];
		if (planetDensity > row.densities[1] && planetDensity < row.densities[2]) {
			likelyTypes.push(row.likelyType);
		} else if (planetDensity > row.densities[0] && planetDensity < row.densities[3]) {
			maybeTypes.push(row.likelyType);
		}
	}
	var densityString = "";
	if (likelyTypes.length > 0) {
		densityString += "\n**Likely**: " + likelyTypes.sort().join(", ");
	}
	if (maybeTypes.length > 0) {
		densityString += "\n**Possible**: " + maybeTypes.sort().join(", ");
	}

	var ret = "The gravity for a planet with " + planetMass + " Earth masses and a radius of ";
	ret += planetRadius + " km is **" + planetM2Str + "** m/s^2 or **" + planetGStr;
	ret += "** g. It has a density of **" + planetDensityStr + "** kg/m^3." + densityString;
	return ret;
}

function writeAliases() {
	fs.writeFile("./sysalias.json",JSON.stringify(edsm.aliases,null,2), null);
}

function writeCmdrAliases() {
	fs.writeFile("./cmdralias.json",JSON.stringify(edsm.cmdraliases,null,2), null);
}

var gmpData = [];
try{
	// We're in the plugin directory, but this is written in the context of the server, one directory down...
	gmpData = require('../gmp-edd.json');
} catch(e) {
	//No aliases defined
	gmpData = [];
}
function writeGmpData() {
	fs.writeFile("./gmp-edd.json",JSON.stringify(gmpData,null,2), null);
}
function refreshGmpData(callback) {
	request('https://www.edsm.net/galactic-mapping/json-edd', function (error, response, body) {
		if (!error && response.statusCode == 200) {
			try {
				var gmp = JSON.parse(body);
				if (gmp.length > 0) {
					gmpData = gmp;
					writeGmpData();
					callback();
				}
			} catch(e) {
				utils.logError("Couldn't refresh galactic mapping project data from EDSM", e);
				callback(e);
			}
		} else {
			callback(error);
		}		
	});
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
		region = edsm.normalizeSystem(region);
		getRegionMap(region, function(data) {
			if (data) {
				var regionString = region;
				if (data.map) {							
					bot.sendFile(msg.channel, "./plugins/elite/maps/" + data.map, data.map, data.region);
					regionString = data.region;
					var newRegionDate = new Date().getTime() - NEW_THRESHHOLD;
					var regionDate = new Date(data.date).getTime();
					if (regionDate > newRegionDate) {
						regionString += "\n*Newly trilaterated region: " + data.date + "*";
					}
					bot.sendMessage(msg.channel, regionString);
				} else {
					bot.sendMessage(msg.channel, "Sorry, I have no map for " + regionString);
				}
			} else {
				bot.sendMessage(msg.channel, "Sorry, I have no information on " + region);
			}
		});
	} else {
		utils.displayUsage(bot,msg,this);
	}
}

const GMP_SUPPORTED_TYPES = {
	'planetaryNebula'		: 'Planetary Nebula',
	'nebula'				: 'Nebula',
	'blackhole'				: 'Black Hole',
	'historicalLocation'	: 'Historical Location',
	'stellarRemnant'		: 'Stellar Remnant',
	'minorPOI'				: 'Minor POI',
	'explorationHazard'		: 'Exploration Hazard',
	'starCluster'			: 'Star Cluster',
	'pulsar'				: 'Neutron Star'
};

// Generate a report of all GMP exceptions within distance ly of coords. If coords is null, generate a report of everything.
function gmpExceptionReport(center, distance, bot, channel) {
	var gmp = gmpData;
	var msgArray = [];
	for (var i = 0; i < gmp.length; i++) {
		var item = gmp[i];
		if (GMP_SUPPORTED_TYPES[item.type]) {
			var itemString = "[" + item.id + "] " + item.name + " (" + GMP_SUPPORTED_TYPES[item.type] + ") -- " + item.galMapSearch + " -- ";
			var process = true;	// We can set this to false to indicate we should skip processing this item
			// If we have a center, calculate the distance between this item and that. 
			if (center) {
				// We'll need to create a new coords structure for the item, since it's not in the same format as the rest of EDSM.
				// EDSM format is: "coords":{"x":X,"y":Y,"z":Z}
				// GMP format is: "coordinates": [-1259.84375,-177.4375,30270.28125]
				var coords = {x: item.coordinates[0], y: item.coordinates[1], z: item.coordinates[2]};
				var itemDistance = edsm.calcDistance(center, coords);
				itemString += " {" + itemDistance.toFixed(2) + " ly}";
				if (itemDistance > distance) {
					process = false;
				}
			}
			if (process) {
				if (item.descriptionHtml == undefined) {
					itemString += " has no description";
					msgArray.push(itemString);
				} else {
					if (item.descriptionHtml.length < 50) {
						item.shortDescription = true;
					}
					if (item.descriptionHtml.includes("<a href") == false) {
						item.noForumLink = true;
					}
					if (item.descriptionHtml.includes("<img ") == false) {
						item.noImage = true;
					}
					if (item.shortDescription || item.noForumLink || item.noImage) {
						var ex = "";
						if (item.shortDescription) {
							if (ex.length > 0) {
								ex += ", ";
							}
							ex += "short description";
						}
						if (item.noForumLink) {
							if (ex.length > 0) {
								ex += ", ";
							}
							ex += "no forum link";
						}
						if (item.noImage) {
							if (ex.length > 0) {
								ex += ", ";
							}
							ex += "no image";
						}
						itemString += " is flagged for: " + ex;
						msgArray.push(itemString);
					}
				}
			}
		}					
	}
	if(msgArray.length > 0) {
		msgArray.unshift("**GMP Data exceptions:**");
		utils.sendMessages(bot, channel, msgArray);
	} else {
		bot.sendMessage(channel, "All data acceptable!");
	}
}

// Generate a report of all GMP exceptions within distance ly of coords. If coords is null, generate a report of everything.
function gmpPoiList(centerName, center, distance, bot, channel) {
	var header = "**GMP POI";
	if (center) {
		header += " within " + distance + " light years of " + centerName;
	}
	header += ":**";
	var gmp = gmpData;
	var msgArray = [];
	for (var i = 0; i < gmp.length; i++) {
		var item = gmp[i];
		if (GMP_SUPPORTED_TYPES[item.type]) {
			var process = true;	// We can set this to false to indicate we should skip processing this item
			// If we have a center, calculate the distance between this item and that. 
			var itemDistance;
			if (center) {
				// We'll need to create a new coords structure for the item, since it's not in the same format as the rest of EDSM.
				// EDSM format is: "coords":{"x":X,"y":Y,"z":Z}
				// GMP format is: "coordinates": [-1259.84375,-177.4375,30270.28125]
				var coords = {x: item.coordinates[0], y: item.coordinates[1], z: item.coordinates[2]};
				itemDistance = edsm.calcDistance(center, coords);
				if (itemDistance > distance) {
					process = false;
				}
			}
			if (process) {
				msgArray.push("**" + item.name + "**");
				if (itemDistance) {
					msgArray.push(itemDistance.toFixed(2) + " ly");
				}
				msgArray.push(item.galMapSearch);
				msgArray.push(GMP_SUPPORTED_TYPES[item.type] + "\n");				
			}
		}					
	}
	if(msgArray.length > 0) {
		msgArray.unshift(header);
		utils.sendMessages(bot, channel, msgArray);
	} else {
		bot.sendMessage(channel, header + " **No GMP POI matching**");
	}
}

function gmpItemMatch(item, query) {
	try {
		if (item.galMapSearch.toUpperCase().includes(query)) {
			return true;
		}
	} catch (e) {
		;
		// console.log("Couldn't do the galmap search for [" + item.id + "]: " + e);
	}
	try {
		if (item.name.toUpperCase().includes(query)) {
			return true;
		}
	} catch (e) {
		;
		// console.log("Couldn't do the name search for [" + item.id + "]: " + e);
	}
	return false;
}

function findGMPItems(query) {
	query = query.toUpperCase();
	var ret = [];
	for (var i = 0; i < gmpData.length; i++) {
		var item = gmpData[i];
		if (gmpItemMatch(item, query)) {
			ret.push(item);
		}
	}
	return ret;
}

var commands = {
	"refresh_gmp": {
		help: "Refresh the Galactic Mapping Project data from EDSM",
		adminOnly: true,
		process: function(args,bot,msg) {
			refreshGmpData(function(error) {
				if (error) {
					bot.sendMessage(msg.channel, "Error refreshing GMP data: " + JSON.stringify(error));
				} else {
					bot.sendMessage(msg.channel, "GMP Data Refreshed!");
				}
			});
		}
	},
	"gmp": {
		usage: "<galmap reference>",
		help: "Displays the current data on a Galactic Mapping Project entry",
		process: function(args,bot,msg) {
			var query = utils.compileArgs(args).toUpperCase();
			if (query.length > 0) {
				if (gmpData && gmpData.length > 0) {
					var msgs = [];
					var items = findGMPItems(query);					
					for (var i = 0; i < items.length; i++) {
						var item = items[i];
						msgs.push("**" + item.name + "**");
						msgs.push(item.galMapSearch);
						msgs.push(GMP_SUPPORTED_TYPES[item.type]);
						msgs.push(item.descriptionMardown);
					}
					if (msgs.length > 0) {
						utils.sendMessages(bot,msg.channel,msgs);
					} else {
						bot.sendMessage(msg.channel, "No GMP point of interest matches that query.");
					}
				} else {
					bot.sendMessage(msg.channel, "No GMP data in system. Please refresh.");
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"gmp_list": {
		usage: "<optional distance in light years> -> <optional system to serve as a center>",
		spammy: true,
		help: "Returns a list of galactic mapping data points of interest, optionally within a certain range of a point.",
		process: function(args,bot,msg) {
			var that = this;
			var query = utils.compileArgs(args).split("->");
			if ((query[0].length > 0) && (query.length <= 2)) {
				query[0] = query[0].trim();
				var dist = parseFloat(query[0]);
				if (query.length == 1) {
					query[1] = "Sol";
				} else {
					query[1] = query[1].trim();
				}
				// We have two options: No args, in which case we do everything, or two args, in which case we do a radius report
				if ((dist != NaN) && (query[1].length > 0)) {
					// Radius report.
					edsm.getSystemOrCmdrCoords(query[1], function(coords) {
						if (coords && coords.coords) {
							gmpPoiList(query[1], coords.coords, dist, bot, utils.pmOrSendChannel(that, pmIfSpam, msg.author, msg.channel));
						} else {
							utils.pmOrSend(bot, that, pmIfSpam, msg.author, msg.channel, "Could not get coordinates for " + query[1]);
						}
					});
				} else {
					utils.displayUsage(bot,msg,that);
				}
			} else {
				// Do everything
				gmpPoiList(undefined, undefined, undefined, bot, utils.pmOrSendChannel(cmd, pmIfSpam, msg.author, msg.channel));
			}
		}
	},
	"gmp_exceptions": {
		usage: "<optional distance in light years> -> <optional system to serve as a center>",
		spammy: true,
		help: "Analyzes the current Galactic Mapping Project data and determines what exceptions there are",
		process: function(args,bot,msg) {
			var that = this;
			var query = utils.compileArgs(args).split("->");
			if ((query[0].length > 0) && (query.length <= 2)) {
				query[0] = query[0].trim();
				var dist = parseFloat(query[0]);
				if (query.length == 1) {
					query[1] = "Sol";
				} else {
					query[1] = query[1].trim();
				}
				// We have two options: No args, in which case we do everything, or two args, in which case we do a radius report
				if ((dist != NaN) && (query[1].length > 0)) {
					// Radius report.
					edsm.getSystemOrCmdrCoords(query[1], function(coords) {
						if (coords && coords.coords) {
							gmpExceptionReport(coords.coords, dist, bot, utils.pmOrSendChannel(that, pmIfSpam, msg.author, msg.channel));
						} else {
							utils.pmOrSend(bot, that, pmIfSpam, msg.author, msg.channel, "Could not get coordinates for " + query[1]);
						}
					});
				} else {
					utils.displayUsage(bot,msg,that);
				}
			} else {
				// Do everything
				gmpExceptionReport(undefined, undefined, bot, utils.pmOrSendChannel(cmd, pmIfSpam, msg.author, msg.channel));
			}
		}
	},
	"g": {
		usage: "<planet mass in earth masses> <planet radius in km>",
		help: "Calculates surface gravity and likely planet types from a planet's mass and radius",
		process: function(args, bot, msg) {
			var displayUsage = true;
			if (args.length === 3) {
				var planetMass = +(args[1]);
				var planetRadius = +(args[2]);
				if(!isNaN(planetMass) && !isNaN(planetRadius)) {
					displayUsage = false;
					bot.sendMessage(msg.channel, handleGravity(planetMass, planetRadius));
				}
			}
			if (displayUsage) {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
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
				var jumpRange = +(args[1]);
				var distSagA = +(args[2]);
				var distMax = undefined;
				if (args.length === 4) {
					distMax = +(args[3]);
					if (isNaN(distMax)) {
						displayUsage = true;
					}
				}
				if (isNaN(jumpRange) || isNaN(distSagA)) {
					displayUsage = true;
				}
				if (!displayUsage) {
					bot.sendMessage(msg.channel, edsm.calcJumpRange(jumpRange, distSagA, distMax));
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
								posString += "\nNo map data exists for " + position + " yet...";
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
		help: "Deletes a system alias.",
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
	},
	"waypoints": {
		usage: "<origin> -> <destination> [-> <jump range>]",
		help: "Get a list of waypoints between the origin and destination to help in-game plotting.",
		spammy: true,
		process: function(args, bot, msg) {
			var that = this;
			var systems = utils.compileArgs(args).split("->");
			if (systems.length >= 2) {
				var origin = systems[0].trim();
				var destination = systems[1].trim();

				console.log(origin + ":" + destination + ":");

				if (origin == destination) {
					utils.sendMessage(bot, msg.channel, origin + " = " + destination + ", which doesn't really make all that much sense.");
					return;
				}

				var jumpRange = undefined;
				if (systems.length == 3) {
					jumpRange = +(systems[2]);
					if (jumpRange == NaN) {
						jumpRange = undefined;
					}
				}

				edsm.getWaypoints(origin, destination, 1000, bot, utils.pmOrSendChannel(that, pmIfSpam, msg.author, msg.channel), jumpRange);
			} else {
				utils.displayUsage(bot,msg,this);
			}			
		}
	},
};

var normalizeSystem = function(system) {
	// We'll look in both the system alias list and the GMP database
	var key = system.toLowerCase();
	if (edsm.aliases[key]) {
		if (edsm.aliases[key].system) {
			return utils.sanitizeString(edsm.aliases[key].system)
		}
	}
	var items = findGMPItems(system);
	if (items.length == 1) {
		if (items[0].galMapSearch) {
			return items[0].galMapSearch;
		}
	}
	return utils.sanitizeString(system);
}

exports.findCommand = function(command) {
	return commands[command];
}

exports.setup = function(config, bot, botconfig) {
	botcfg = botconfig;
	// For dependency injection
	if (botconfig.edsm) {
		edsm = botconfig.edsm;		
	}
	if (botconfig.pmIfSpam) {
		pmIfSpam = true;
	}
	if (config) {
		if (config.regionfont) {
			regionjpg.setRegionFont(config.regionfont);
		}
	}
	// Override edsm.normalizeSystem...
	edsm.setNormalizeSystem(normalizeSystem);
}

exports.commands = commands;