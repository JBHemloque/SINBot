'use strict';

var fs = require("fs");
var _ = require("underscore");
var request = require('request');
var path = require('path');
var base = require('../base.js');
var utils = require('../server/utils.js');
var edsm = require('./elite/edsm.js');
var alphanum = require("../server/alphanum.js");
var regionjpg = require("./elite/regionjpg.js");
var gmp = require('./elite/gmp.js');
var regions = require('./elite/regions.js');

var botcfg = null;
var pmIfSpam = false;

var cmdrs;
try{
    console.log('  - Loading ' + path.resolve(base.path, "cmdrs.json"));
    cmdrs = require(path.resolve(base.path, "cmdrs.json"));
} catch(e) {
    cmdrs = {};
}

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

/**
Implements Jackie Silver's method of stellar density calculation

To find the density, look at the navpanel. If there are more than 50 star systems within 20 light years, 
only the first 50 systems will be shown. Otherwise, the navpanel will show all systems within 20 light years.

This gives us two ways of finding the density:

1) For dense areas where there are more than 50 star systems, look at the last star system in the list, 
and see what its distance ("r") from your ship is. This lets us estimate the density as rho = 50 / ((4pi/3) * (r^3))

2) For sparse areas where there are less than 50 star systems, count how many star systems ("n") are visible in 
total in the navpanel. This lets us estimate the density as rho = n / ((4pi/3) * (20^3))

This function prioritizes 1) over 2) - so it will perform method 1 if r is not undefined, otherwise 2
**/
function calcRho(r, n) {
    if (r) {
        return 50 / ((4 * Math.PI / 3) * Math.pow(r, 3));
    } else if (n) {
        return n / ((4 * Math.PI / 3) * Math.pow(20, 3));
    }
    return undefined;
}

function writeAliases() {
    fs.writeFile(path.resolve(base.path, "sysalias.json"),JSON.stringify(edsm.aliases,null,2), null);
}

function writeCmdrAliases() {
    fs.writeFile(path.resolve(base.path, "cmdralias.json"),JSON.stringify(edsm.cmdraliases,null,2), null);
}

function writeCmdrs() {
    fs.writeFile(path.resolve(base.path, "cmdrs.json"),JSON.stringify(cmdrs,null,2), null);
}

function getRegionMap(location, callback) {
    var names = location.split(/ [a-z][a-z]-[a-z] /i);
    var key = names[0].toLowerCase();
    console.log("Looking for region key: " + key);
    regions.getRegionByKey(key, function(region) {
        if (region) {
            var name = region.region;
            var key = name.toLowerCase();
            regionjpg.fetchRegionMap(key, function(rgn) {
                callback(rgn);
            });
        } else {
            edsm.getSystemCoordsAsync(location, function(sys) {
                if (sys && sys.coords) {
                    var coords = sys.coords;
                    // z is the Y coordinate looking down at the map
                    regionjpg.fetchRegionMapByCoords(coords.x, coords.z, function(rgn) {
                        callback(rgn);
                    });
                } else {
                    callback(undefined);
                }
            });            
        }  
    });
}

function _showRegion(region, bot, msg) {
    var orgRegion = region;
    region = edsm.normalizeSystem(region);
    // EDSM wants spaces => %20, but our region map leaves them spaces, so...
    region = region.replace('%20', ' ');
    getRegionMap(region, function(data) {
        if (data) {
            var regionString = region;
            if (orgRegion !== region) {
                regionString = orgRegion + " (" + region + ")";
            }
            if (data.map) {
                // regionString = data.region;
                var newRegionDate = new Date().getTime() - NEW_THRESHHOLD;
                var regionDate = new Date(data.date).getTime();
                if (regionDate > newRegionDate) {
                    regionString += "\n*Newly trilaterated region: " + data.date + "*";
                }
                msg.channel.sendFile(path.resolve(base.path, "plugins/elite/maps/" + data.map), data.map, regionString);
            } else {
                utils.sendMessage(bot, msg.channel, "Sorry, I have no map for " + regionString);
            }
        } else {
            utils.sendMessage(bot, msg.channel, "Sorry, I have no information on " + orgRegion);
        }
    });
}

function showRegion(args, bot, msg) {
    if (args.length > 1) {
        var region = utils.compileArgs(args);
        _showRegion(region, bot, msg);
    } else {
        utils.displayUsage(bot,msg,this);
    }
}

function getAuthorId(msg) {
    if (msg.author) {
        return msg.author.id;
    }
    return undefined;
}

function getEdsmName(msg) {
    var authorId = getAuthorId(msg);
    if (authorId) {
        return cmdrs[authorId];
    }
    return undefined;
}

function getCmdrName(args, msg) {
    var name = utils.compileArgs(args);
    if (!name) {
        name = getEdsmName(msg);
    }
    return name;
}

var commands = {
    "register": {
        usage: "register <EDSM name>",
        help: "Register your EDSM name as a default for commands that use it",
        process: function(args, bot, msg) {
            var edsmName = utils.compileArgs(args);
            var authorId = getAuthorId(msg);
            if (edsmName) {
                if (authorId) {
                    console.log('Register ' + authorId + ' as ' + edsmName);
                    cmdrs[authorId] = edsmName;
                    writeCmdrs();
                    utils.sendMessage(bot, msg.channel, "Registered as " + edsmName);
                } else {
                    utils.sendMessage(bot, msg.channel, "Sorry, an error occurred attempting to register your name");
                }
            } else {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "showcmdr": {
        help: "Show your EDSM name, if registered",
        process: function(args, bot, msg) {
            var edsmName = getEdsmName(msg);
            if (edsmName) {
                utils.sendMessage(bot, msg.channel, "You are registered with the EDSM name " + edsmName);
            } else {
                utils.sendMessage(bot, msg.channel, "You have not registered an EDSM name with the 'register' command");
            }
        }
    },
    "refresh_gmp": {
        help: "Refresh the Galactic Mapping Project data from EDSM",
        adminOnly: true,
        process: function(args,bot,msg) {
            gmp.refreshGmpData(function(error) {
                if (error) {
                    utils.sendMessage(bot, msg.channel, "Error refreshing GMP data: " + JSON.stringify(error));
                } else {
                    utils.sendMessage(bot, msg.channel, "GMP Data Refreshed!");
                }
            });
        }
    },
    "gmp": {
        usage: "gmp <galmap reference>",
        help: "Displays the current data on any Galactic Mapping Project entries matching the reference",
        process: function(args,bot,msg) {
            var query = utils.compileArgs(args).toUpperCase();
            if (query.length > 0) {
                if (gmp.hasGmpData()) {
                    var msgs = [];
                    var items = gmp.findGMPItems(query);
                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        msgs.push("**" + item.name + "**");
                        msgs.push(item.galMapSearch);
                        msgs.push(gmp.getGmpType(item.type));
                        var desc = item.descriptionMardown;
                        if (desc.length > 800) {
                            // Too long...
                            desc = desc.substring(0, 800);
                            desc += "...";
                        }
                        msgs.push(desc);
                        msgs.push(" ");
                    }
                    if (msgs.length > 0) {
                        utils.sendMessages(bot,msg.channel,msgs);
                    } else {
                        utils.sendMessage(bot, msg.channel, "No GMP point of interest matches that query.");
                    }
                } else {
                    utils.sendMessage(bot, msg.channel, "No GMP data in system. Please refresh.");
                }
            } else {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "gmp_list": {
        // @@todo - broken!
        usage: "gmp_list <optional distance in light years> -> <optional system to serve as a center>",
        spammy: true,
        help: "Returns a list of galactic mapping data points of interest, optionally within a certain range of a point.",
        process: function(args,bot,msg) {
            console.log("gmp_list...");
            var that = this;
            var query = utils.compileArgs(args).split(/->|:/);
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
                            gmp.gmpPoiList(query[1], coords.coords, dist, bot, utils.pmOrSendChannel(that, pmIfSpam, msg.author, msg.channel));
                        } else {
                            utils.pmOrSend(bot, that, pmIfSpam, msg.author, msg.channel, "Could not get coordinates for " + query[1]);
                        }
                    });
                } else {
                    utils.displayUsage(bot,msg,that);
                }
            } else {
                // Do everything
                console.log("Running gmpPoiList on everything...");
                gmp.gmpPoiList(undefined, undefined, undefined, bot, utils.pmOrSendChannel(cmd, pmIfSpam, msg.author, msg.channel));
            }
        }
    },
    "gmp_exceptions": {
        usage: "gmp_exceptions <optional distance in light years> -> <optional system to serve as a center>",
        spammy: true,
        help: "Analyzes the current Galactic Mapping Project data and determines what exceptions there are",
        process: function(args,bot,msg) {
            var that = this;
            var query = utils.compileArgs(args).split(/->|:/);
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
                            gmp.gmpExceptionReport(coords.coords, dist, bot, utils.pmOrSendChannel(that, pmIfSpam, msg.author, msg.channel));
                        } else {
                            utils.pmOrSend(bot, that, pmIfSpam, msg.author, msg.channel, "Could not get coordinates for " + query[1]);
                        }
                    });
                } else {
                    utils.displayUsage(bot,msg,that);
                }
            } else {
                // Do everything
                gmp.gmpExceptionReport(undefined, undefined, bot, utils.pmOrSendChannel(cmd, pmIfSpam, msg.author, msg.channel));
            }
        }
    },
    "g": {
        usage: "g <planet mass in earth masses> <planet radius in km>",
        help: "Calculates surface gravity and likely planet types from a planet's mass and radius",
        process: function(args, bot, msg) {
            var displayUsage = true;
            if (args.length === 3) {
                var planetMass = +(args[1]);
                var planetRadius = +(args[2]);
                if(!isNaN(planetMass) && !isNaN(planetRadius)) {
                    displayUsage = false;
                    utils.sendMessage(bot, msg.channel, handleGravity(planetMass, planetRadius));
                }
            }
            if (displayUsage) {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "rho_dense": {
        usage: "rho_dense <distance>",
        help: "Calculates stellar density for dense areas (50 star systems in the nav panel) using the distance to the last star in the list.",
        extendedhelp: "IMPORTANT: This calculation is only accurate if there are 50 stars in your nav panel. Look at the last star system in the panel, and enter the distance from your ship.",
        process: function(args, bot, msg) {
            var displayUsage = true;
            if (args.length === 2) {
                var distance = args[1];
                var density = calcRho(distance, undefined);
                if(!isNaN(density)) {
                    displayUsage = false;
                    utils.sendMessage(bot, msg.channel, "rho = " + density);
                }
            }
            if (displayUsage) {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "rho_sparse": {
        usage: "rho_sparse <count>",
        help: "Calculates stellar density for sparse areas ( < 50 star systems in the nav panel) using the count of star systems in the list.",
        extendedhelp: "IMPORTANT: This calculation is only accurate if there are less than 50 stars in your nav panel. Count the number of star systems in the nav panel, and enter the count.",
        process: function(args, bot, msg) {
            var displayUsage = true;
            if (args.length === 2) {
                var count = args[1];
                var density = calcRho(undefined, count);
                if(!isNaN(density)) {
                    displayUsage = false;
                    utils.sendMessage(bot, msg.channel, "rho = " + density);
                }
            }
            if (displayUsage) {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "region": {
        usage: "region <region>",
        help: "Shows where a region is in the galaxy",
        process: showRegion
    },
    "show": {
        usage: "show <region or system>",
        help: "Shows where a region or named system is in the galaxy",
        process: showRegion
    },
    "route": {
        usage: "route <JumpRange> <SgrA distance in kly> [optional max plot in ly]",
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
                    utils.sendMessage(bot, msg.channel, edsm.calcJumpRange(jumpRange, distSagA, distMax));
                }
            } 

            if (displayUsage) {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "traveltime": {
        usage: "traveltime <JumpRange> <travelDistance> [optional time per jump in seconds - defaults to 60]",
        help: "Estimate travel time",
        process: function(args, bot, msg) {
            var displayUsage = true;
            if ((args.length === 4) || (args.length === 3)) {
                displayUsage = false;
                var jumpRange = +(args[1]);
                var distance = +(args[2]);
                var secondsPerJump = 60;
                if (args.length === 4) {
                    secondsPerJump = args[3];
                    if (isNaN(secondsPerJump)) {
                        displayUsage = true;
                    }
                }
                if (isNaN(jumpRange) || isNaN(distance)) {
                    displayUsage = true;
                }
                if (!displayUsage) {
                    var tt = (distance / jumpRange) * (secondsPerJump) * 1.1 * 1000;
                    var output = "Travel time should be approximately " + utils.formatTimeDuration(tt);
                    utils.sendMessage(bot, msg.channel, output);
                }
            } 

            if (displayUsage) {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "showloc": {
        usage: "showloc <name>",
        help: 'Shows the location of a commander.',
        extendedhelp: "Shows the location of a commander. We use information from EDSM to do this. In order to be findable, the commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public.",
        process: function(args,bot,msg) {
            var name = getCmdrName(args, msg);
            if (name) {
                edsm.getPositionString(name, function(posStringObj, position) {
                    if (position) {
                        getRegionMap(position, function(data) {
                            if (data) {
                                if (data.map) {
                                    msg.channel.sendFile(path.resolve(base.path, "plugins/elite/maps/" + data.map), data.map);
                                    utils.sendMessage(bot, msg.channel, posStringObj.message);
                                } else {
                                    utils.sendMessage(bot, msg.channel, posStringObj.message);
                                }
                            } else {
                                posStringObj.message += "\nNo map data exists for " + position + " yet...";
                                utils.sendMessage(bot, msg.channel, posStringObj.message);
                            }
                        });
                    } else {
                        if (posStringObj.commanderExists) {
                            // EDSM doesn't have position info on them
                            utils.sendMessage(bot, msg.channel, posStringObj.message);
                        } else {
                            _showRegion(name, bot, msg);
                        }
                    }                
                });
            } else {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "loc": {
        usage: "loc <name>",
        help: 'Gets the location of a commander.',
        extendedhelp: "Gets the location of a commander. We use information from EDSM to do this. In order to be findable, the commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public.",
        process: function(args,bot,msg) {
            var name = getCmdrName(args,msg);
            if (name) {
                edsm.getPosition(name, bot, msg);
            } else {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "syscoords": {
        usage: "syscoords <system>",
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
        usage: "cmdrcoords <name>",
        help: "Gets the location of a commander, including system coordinates, if they are available.",
        extendedhelp: "Gets the location of a commander, including system coordinates. We use information from EDSM to do this. In order to be findable, the commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public. In addition, the system they are in must have coordinates in EDSM. Applications such as EDDiscovery make this easy to do.",
        process: function(args,bot,msg) {
            var name = getCmdrName(args,msg);
            if (name) {
                edsm.getCmdrCoords(name, bot, msg);
            } else {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "dist": {
        usage: "dist <optional first> -> <optional second>",
        help: "Gets the distance from one system or commander to another. If only one system or commander is given, the second is assumed to be your EDSM name (if you've registered one), or Sol (if you have not). If none are given and you've registered an EDSM name, your distance from Sol is displayed.",
        extendedhelp: "Gets the distance from one system or commander to another. If only one system or commander is given, the second is assumed to be your EDSM name (if you've registered one), or Sol (if you have not). If none are given and you've registered an EDSM name, your distance from Sol is displayed. We use information from EDSM to do this. In order to be findable, a commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public. In addition, the system they are in must have coordinates in EDSM. Likewise, for distance calculations, a system must have coordinates in EDSM. Applications such as EDDiscovery make this easy to do.",
        process: function(args,bot,msg) {
            var query = utils.compileArgs(args).split(/->|:/);
            var edsmName = getEdsmName(msg);
            if (query.length <= 2) {
                query[0] = query[0].trim();
                if (query.length == 1) {
                    if (query[0].length == 0) {
                        if (edsmName) {
                            console.log("All defaults: dist " + edsmName + " -> Sol");
                            query[0] = edsmName;
                            query[1] = "Sol";
                        }
                    } else {
                        if (edsmName) {
                            console.log("One default: dist " + query[0] + " -> " + edsmName);
                            query[1] = edsmName;
                        } else {
                            console.log("One default: dist " + query[0] + " -> Sol");
                            query[1] = "Sol";
                        }
                    }
                } else {
                    console.log("No defaults: dist " + query[0] + " -> " + query[1]);
                    query[1] = query[1].trim();
                }
                if ((query[0].length > 0) && (query[1].length > 0)) {
                    console.log("Displaying distance");
                    edsm.getDistance(query[0], query[1], bot, msg);
                } else {
                    console.log("Couldn't run, displaying usage");
                    utils.displayUsage(bot,msg,this);
                }
            } else {
                console.log("Pathological number of -> delimiters...");
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "cmdralias": {
        usage: "cmdralias <alias> -> <commander> [-> <optional expedition>]",
        adminOnly: true,
        help: "Creates a CMDR alias -- e.g. Falafel Expedition Leader can alias CMDR Falafel.",
        extendedhelp: "Creates or updates a CMDR alias -- e.g. Falafel Expedition Leader can alias CMDR Falafel -- with an optional expedition. This is useful simply as a convenience.",
        process: function(args, bot, msg) {
            var systems = utils.compileArgs(args).split(/->|:/);
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
                    utils.sendMessage(bot, msg.channel,output);
                } else {
                    utils.displayUsage(bot,msg,this);
                }
            } else {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "show_cmdralias": {
        usage: "show_cmdralias <alias>",
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
                utils.sendMessage(bot, message.channel, output);
            } else {
                displayUsage(bot, message, this);
            }        
        }
    },
    "clear_cmdralias": {
        usage: "clear_cmdralias <alias>",
        adminOnly: true,
        help: "Deletes a CMDR alias.",
        process: function(args, bot, message) {
            var alias = args[1].toLowerCase();
            if(alias) {
                if (edsm.cmdraliases[alias]) {
                    delete edsm.cmdraliases[alias];
                    writeCmdrAliases();
                    utils.sendMessage(bot, message.channel, "Deleted CMDR alias " + alias);
                } else {
                    utils.sendMessage(bot, message.channel, "Sorry, " + alias + " doesn't exist.");
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
        usage: "sysalias <alias> -> <system> [-> <optional expedition>]",
        adminOnly: true,
        help: "Creates a system alias -- e.g. Beagle Point can alias CEECKIA ZQ-L C24-0.",
        extendedhelp: "Creates a system alias -- e.g. Beagle Point can alias CEECKIA ZQ-L C24-0 -- with an optional expedition. This is useful simply as a convenience. Many systems have several accepted designations (like Beagle Point, for instance, or RR Lyrae, which is another designation for HIP 95497).",
        process: function(args, bot, msg) {
            var systems = utils.compileArgs(args).split(/->|:/);
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
                    utils.sendMessage(bot, msg.channel,output);
                } else {
                    utils.displayUsage(bot,msg,this);
                }
            } else {
                utils.displayUsage(bot,msg,this);
            }
        }
    },
    "show_sysalias": {
        usage: "show_sysalias <alias>",
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
                utils.sendMessage(bot, message.channel, output);
            } else {
                displayUsage(bot, message, this);
            }        
        }
    },
    "clear_sysalias": {
        usage: "clear_sysalias <alias>",
        adminOnly: true,
        help: "Deletes a system alias.",
        process: function(args, bot, message) {
            var system = utils.compileArgs(args);
            if(system) {
                if (edsm.aliases[system.toLowerCase()]) {
                    delete edsm.aliases[system.toLowerCase()];
                    writeAliases();
                    utils.sendMessage(bot, message.channel, "Deleted system alias " + system);
                } else {
                    utils.sendMessage(bot, message.channel, "Sorry, " + system + " doesn't exist.");
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
        usage: "expsa <system alias> -> <expedition>",
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
                        utils.sendMessage(bot, msg.channel, "Assigned " + query[0] + " to " + query[1]);
                    } else {
                        utils.sendMessage(bot, msg.channel, query[0] + " is not in my records.")
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
        usage: "expa <alias> -> <expedition>[ -> <optional alias>]",
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
                        var alias = botcfg.makeAlias(query[0], query[2].trim(), botcfg.findCommand, function(alias) {
                            alias.expedition = query[1];
                        });
                        if (alias.displayUsage) {
                            displayUsage(bot, msg, this);
                        } else if (alias.error) {
                            utils.sendMessage(bot, msg.channel, alias.message);
                        } else {
                            utils.sendMessage(bot, msg.channel,"Created alias " + alias.alias + " in expedition " + query[1]);
                        }
                    } else {
                        if (botcfg.aliases[query[0].toLowerCase()]) {
                            botcfg.aliases[query[0].toLowerCase()].expedition = query[1];
                            botcfg.writeAliases();
                            utils.sendMessage(bot, msg.channel, "Assigned " + query[0] + " to " + query[1]);
                        } else {
                            utils.sendMessage(bot, msg.channel, query[0] + " is not in my records.")
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
        usage: "explist <expedition>",
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
                    utils.sendMessage(bot, msg.channel, expedtition + " is an empty expedition");
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
};

var normalizeSystem = function(system) {
    // We'll look in both the system alias list and the GMP database
    var key = system.toLowerCase();
    if (edsm.aliases[key]) {
        if (edsm.aliases[key].system) {
            return utils.sanitizeString(edsm.aliases[key].system)
        }
    }
    var items = gmp.findGMPItems(system);
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
