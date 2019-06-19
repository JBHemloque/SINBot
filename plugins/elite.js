'use strict';

var fs = require("fs");
var _ = require("underscore");
var request = require('request');
var path = require('path');
var base = require(path.resolve(__dirname, '../base.js'));
var utils = require(path.resolve(base.path, 'server/utils.js'));
var edsm = require(path.resolve(base.path, 'plugins/elite/edsm.js'));
var regionjpg = require(path.resolve(base.path, 'plugins/elite/regionjpg.js'));
var gmp = require(path.resolve(base.path, 'plugins/elite/gmp.js'));
var regions;
var elitelib = require(path.resolve(base.path, 'plugins/elite/elitelib.js'));

var botcfg = null;
var pmIfSpam = false;

var cmdrs;
try{
    utils.debugLog('  - Loading ' + path.resolve(base.path, "cmdrs.json"));
    cmdrs = require(path.resolve(base.path, "cmdrs.json"));
} catch(e) {
    cmdrs = {};
}

function writeAliases() {
    fs.writeFile(path.resolve(base.path, "sysalias.json"),JSON.stringify(edsm.aliases,null,2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });
}

function writeCmdrAliases() {
    fs.writeFile(path.resolve(base.path, "cmdralias.json"),JSON.stringify(edsm.cmdraliases,null,2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });
}

function writeCmdrs() {
    fs.writeFile(path.resolve(base.path, "cmdrs.json"),JSON.stringify(cmdrs,null,2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });
}

function generateRegionMapByCoords(location, callback) {
    edsm.getSystemCoordsAsync(location, function(sys) {
        if (sys && sys.coords) {
            var coords = sys.coords;
            // z is the Y coordinate looking down at the map
            regionjpg.fetchRegionMapByCoords(coords.x, coords.z, location, function(rgn) {
                callback(rgn);
            });
        } else {
            callback(undefined);
        }
    });
}

var regionsLib = function() {
    if (!regions) {
        regions = require(path.resolve(base.path, 'plugins/elite/regions.js'));
    }
    return regions;
}

function getRegionMap(location, callback) {
    var key = elitelib.getRegionName(location);
    console.log("getRegionMap: Key = " + key);
    regionsLib().getRegionByKey(key, function(region) {
        if (region) {
            var name = region.region;
            key = name.toLowerCase();
            if (regionjpg.fetchRegionMap(key, function(rgn) {
                callback(rgn);
            }))
            {
                generateRegionMapByCoords(location, callback);
            }
        } else {
            generateRegionMapByCoords(location, callback);       
        }  
    });
}

function _showRegion(region, bot, msg) {
    return new Promise(function(resolve, reject) {
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
                    msg.channel.sendFile(path.resolve(base.path, "plugins/elite/maps/" + data.map), data.map, regionString)
                    .then(function() {
                        resolve();
                    });
                } else {
                    utils.sendMessage(bot, msg.channel, "Sorry, I have no map for " + regionString)
                    .then(function() {
                        resolve();
                    });
                }
            } else {
                utils.sendMessage(bot, msg.channel, "Sorry, I have no information on " + orgRegion)
                .then(function() {
                    resolve();
                });
            }
        });
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
                    return utils.sendMessage(bot, msg.channel, "Registered as " + edsmName);
                } else {
                    return utils.sendMessage(bot, msg.channel, "Sorry, an error occurred attempting to register your name");
                }
            }
            return utils.displayUsage(bot,msg,this);
        }
    },
    "showcmdr": {
        help: "Show your EDSM name, if registered",
        process: function(args, bot, msg) {
            var edsmName = getEdsmName(msg);
            if (edsmName) {
                return utils.sendMessage(bot, msg.channel, "You are registered with the EDSM name " + edsmName);
            } else {
                return utils.sendMessage(bot, msg.channel, "You have not registered an EDSM name with the 'register' command");
            }
        }
    },
    "refresh_gmp": {
        help: "Refresh the Galactic Mapping Project data from EDSM",
        adminOnly: true,
        process: function(args,bot,msg) {
            gmp.refreshGmpData(function(error) {
                if (error) {
                    return utils.sendMessage(bot, msg.channel, "Error refreshing GMP data: " + JSON.stringify(error));
                } else {
                    return utils.sendMessage(bot, msg.channel, "GMP Data Refreshed!");
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
                        return utils.sendMessages(bot,msg.channel,msgs);
                    } else {
                        return utils.sendMessage(bot, msg.channel, "No GMP point of interest matches that query.");
                    }
                } else {
                    return utils.sendMessage(bot, msg.channel, "No GMP data in system. Please refresh.");
                }
            }
            return utils.displayUsage(bot,msg,this);
        }
    },
    // @@TODO - These are broken
    // "gmp_list": {
    //     usage: "gmp_list <optional distance in light years> -> <optional system to serve as a center>",
    //     spammy: true,
    //     help: "Returns a list of galactic mapping data points of interest, optionally within a certain range of a point.",
    //     process: function(args,bot,msg) {
    //         console.log("gmp_list...");
    //         var that = this;
    //         var query = utils.compileArgs(args).split(/->|:/);
    //         if ((query[0].length > 0) && (query.length <= 2)) {
    //             query[0] = query[0].trim();
    //             var dist = parseFloat(query[0]);
    //             if (query.length == 1) {
    //                 query[1] = "Sol";
    //             } else {
    //                 query[1] = query[1].trim();
    //             }
    //             // We have two options: No args, in which case we do everything, or two args, in which case we do a radius report
    //             if ((dist != NaN) && (query[1].length > 0)) {
    //                 // Radius report.
    //                 edsm.getSystemOrCmdrCoords(query[1], function(coords) {
    //                     if (coords && coords.coords) {
    //                         gmp.gmpPoiList(query[1], coords.coords, dist, bot, utils.pmOrSendChannel(that, pmIfSpam, msg.author, msg.channel));
    //                     } else {
    //                         utils.pmOrSend(bot, that, pmIfSpam, msg.author, msg.channel, "Could not get coordinates for " + query[1]);
    //                     }
    //                 });
    //             } else {
    //                 utils.displayUsage(bot,msg,that);
    //             }
    //         } else {
    //             // Do everything
    //             console.log("Running gmpPoiList on everything...");
    //             gmp.gmpPoiList(undefined, undefined, undefined, bot, utils.pmOrSendChannel(cmd, pmIfSpam, msg.author, msg.channel));
    //         }
    //     }
    // },
    // "gmp_exceptions": {
    //     usage: "gmp_exceptions <optional distance in light years> -> <optional system to serve as a center>",
    //     spammy: true,
    //     help: "Analyzes the current Galactic Mapping Project data and determines what exceptions there are",
    //     process: function(args,bot,msg) {
    //         var that = this;
    //         var query = utils.compileArgs(args).split(/->|:/);
    //         if ((query[0].length > 0) && (query.length <= 2)) {
    //             query[0] = query[0].trim();
    //             var dist = parseFloat(query[0]);
    //             if (query.length == 1) {
    //                 query[1] = "Sol";
    //             } else {
    //                 query[1] = query[1].trim();
    //             }
    //             // We have two options: No args, in which case we do everything, or two args, in which case we do a radius report
    //             if ((dist != NaN) && (query[1].length > 0)) {
    //                 // Radius report.
    //                 edsm.getSystemOrCmdrCoords(query[1], function(coords) {
    //                     if (coords && coords.coords) {
    //                         gmp.gmpExceptionReport(coords.coords, dist, bot, utils.pmOrSendChannel(that, pmIfSpam, msg.author, msg.channel));
    //                     } else {
    //                         utils.pmOrSend(bot, that, pmIfSpam, msg.author, msg.channel, "Could not get coordinates for " + query[1]);
    //                     }
    //                 });
    //             } else {
    //                 utils.displayUsage(bot,msg,that);
    //             }
    //         } else {
    //             // Do everything
    //             gmp.gmpExceptionReport(undefined, undefined, bot, utils.pmOrSendChannel(cmd, pmIfSpam, msg.author, msg.channel));
    //         }
    //     }
    // },
    "g": {
        usage: "g <planet mass in earth masses> <planet radius in km>",
        help: "Calculates surface gravity and likely planet types from a planet's mass and radius",
        process: function(args, bot, msg) {
            if (args.length === 3) {
                var planetMass = +(args[1]);
                var planetRadius = +(args[2]);
                if(!isNaN(planetMass) && !isNaN(planetRadius)) {
                    return utils.sendMessage(bot, msg.channel, elitelib.handleGravity(planetMass, planetRadius));
                }
            }
            return utils.displayUsage(bot,msg,this);
        }
    },
    "rho_dense": {
        usage: "rho_dense <distance>",
        help: "Calculates stellar density for dense areas (50 star systems in the nav panel) using the distance to the last star in the list.",
        extendedhelp: "IMPORTANT: This calculation is only accurate if there are 50 stars in your nav panel. Look at the last star system in the panel, and enter the distance from your ship.",
        process: function(args, bot, msg) {
            if (args.length === 2) {
                var distance = args[1];
                var density = elitelib.calcRho(distance, undefined);
                if(!isNaN(density)) {
                    return utils.sendMessage(bot, msg.channel, "rho = " + density);
                }
            }
            return utils.displayUsage(bot,msg,this);
        }
    },
    "rho_sparse": {
        usage: "rho_sparse <count>",
        help: "Calculates stellar density for sparse areas ( < 50 star systems in the nav panel) using the count of star systems in the list.",
        extendedhelp: "IMPORTANT: This calculation is only accurate if there are less than 50 stars in your nav panel. Count the number of star systems in the nav panel, and enter the count.",
        process: function(args, bot, msg) {
            if (args.length === 2) {
                var count = args[1];
                var density = elitelib.calcRho(undefined, count);
                if(!isNaN(density)) {
                    displayUsage = false;
                    return utils.sendMessage(bot, msg.channel, "rho = " + density);
                }
            }
            return utils.displayUsage(bot,msg,this);
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
                    return utils.sendMessage(bot, msg.channel, output);
                }
            } 

            return utils.displayUsage(bot,msg,this);
        }
    },
    "showloc": {
        usage: "showloc <name>",
        help: 'Shows the location of a commander.',
        extendedhelp: "Shows the location of a commander. We use information from EDSM to do this. In order to be findable, the commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public.",
        process: function(args,bot,msg) {
            var thisCmd = this;
            return new Promise(function(response, reject) {
                var name = getCmdrName(args, msg);
                if (name) {
                    edsm.getPositionString(name, function(posStringObj, position) {
                        if (position) {
                            getRegionMap(position, function(data) {
                                if (data) {
                                    if (data.map) {
                                        msg.channel.sendFile(path.resolve(base.path, "plugins/elite/maps/" + data.map), data.map);
                                        utils.sendMessage(bot, msg.channel, posStringObj.message)
                                        .then(function() {
                                            response();                          
                                        });                                       
                                    } else {
                                        utils.sendMessage(bot, msg.channel, posStringObj.message)
                                        .then(function() {
                                            response();                          
                                        });
                                    }
                                } else {
                                    posStringObj.message += "\nNo map data exists for " + position + " yet...";
                                    utils.sendMessage(bot, msg.channel, posStringObj.message)
                                    .then(function() {
                                        response();                          
                                    });
                                }
                            });
                        } else {
                            if (posStringObj.commanderExists) {
                                // EDSM doesn't have position info on them
                                utils.sendMessage(bot, msg.channel, posStringObj.message)
                                .then(function() {
                                    response();                          
                                });
                            } else {
                                _showRegion(name, bot, msg)
                                .then(function() {
                                    response();
                                });
                            }
                        }                
                    });
                } else {
                    utils.displayUsage(bot,msg,thisCmd)
                    .then(function() {
                        response();
                    })
                }                
            });
        }
    },
    "loc": {
        usage: "loc <name>",
        help: 'Gets the location of a commander.',
        extendedhelp: "Gets the location of a commander. We use information from EDSM to do this. In order to be findable, the commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public.",
        process: function(args,bot,msg,cmd) {
            var name = getCmdrName(args,msg);
            if (name) {
                return new Promise(function(resolve, reject) {
                    edsm.getPositionString(name, function(data) {
                        utils.sendMessage(bot, msg.channel, data.message).then(resolve);
                    });
                });
            }
            return utils.displayUsage(bot,msg,this);
        }
    },
    "syscoords": {
        usage: "syscoords <system>",
        help: 'Gets the galactic coordinates of a system.',
        extendedhelp: "Gets the galactic coordinates of a system. We use information from EDSM to do this. The system must have coordinates in EDSM. Applications such as EDDiscovery make this easy to do.",
        process: function(args,bot,msg) {
            if (args.length > 1) {
                return edsm.getSystemCoords(utils.compileArgs(args), bot, msg);
            }
            return utils.displayUsage(bot,msg,this);
        }
    },
    "cmdrcoords": {
        usage: "cmdrcoords <name>",
        help: "Gets the location of a commander, including system coordinates, if they are available.",
        extendedhelp: "Gets the location of a commander, including system coordinates. We use information from EDSM to do this. In order to be findable, the commander must be sharing their flight logs with EDSM, and they must have set their profile to make the flight logs public. In addition, the system they are in must have coordinates in EDSM. Applications such as EDDiscovery make this easy to do.",
        process: function(args,bot,msg) {
            var name = getCmdrName(args,msg);
            if (name) {
                return edsm.getCmdrCoords(name, bot, msg);
            }
            return utils.displayUsage(bot,msg,this);
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
                            query[0] = edsmName;
                            query[1] = "Sol";
                        }
                    } else {
                        if (edsmName) {
                            query[1] = edsmName;
                        } else {
                            query[1] = "Sol";
                        }
                    }
                } else {
                    query[1] = query[1].trim();
                }
                if ((query[0].length > 0) && (query[1].length > 0)) {
                    return edsm.getDistance(query[0], query[1], bot, msg);
                } else {
                    return utils.displayUsage(bot,msg,this);
                }
            }
            return utils.displayUsage(bot,msg,this);
        }
    },
    "cmdralias": {
        usage: "cmdralias <alias> -> <commander> [-> <optional expedition>]",
        adminOnly: true,
        help: "Creates a CMDR alias -- e.g. Falafel Expedition Leader can alias CMDR Falafel.",
        extendedhelp: "Creates or updates a CMDR alias -- e.g. Falafel Expedition Leader can alias CMDR Falafel -- with an optional expedition. This is useful simply as a convenience.",
        process: function(args, bot, msg) {
            var names = utils.compileArgs(args).split(/->|:/);
            if (names.length >= 2) {
                names[0] = names[0].trim();
                names[1] = names[1].trim();
                if ((names[0].length > 0) && (names[1].length > 0)) {
                    var key = names[0].toLowerCase();
                    var output = "created CMDR alias from " + names[0] + " -> " + names[1];
                    var cmdralias = {alias: names[0], cmdr: names[1]}; 
                    var item = edsm.cmdraliases[key];
                    // Optional expedition
                    if (names.length == 3) {
                        names[2] = names[2].trim();
                        cmdralias.expedition = names[2];
                        output += " for " + names[2];
                    }
                    if (item) {
                        _.extend(item, cmdralias);
                    } else {
                        item = cmdralias;
                    }
                    edsm.cmdraliases[key] = item;
                    
                    //now save the new alias
                    writeCmdrAliases();
                    return utils.sendMessage(bot, msg.channel,output);
                } else {
                    return utils.displayUsage(bot,msg,this);
                }
            }            
            return utils.displayUsage(bot, msg, this);
        }
    },
    "show_cmdralias": {
        usage: "show_cmdralias <alias>",
        help: "Displays a CMDR alias.",
        process: function(args, bot, msg) {
            if (args.length > 1) {
                var alias = edsm.cmdraliases[args[1].toLowerCase()];
                var output = args[1] + " is not a CMDR alias.";
                if (alias) {
                    output = alias.alias + " -> " + alias.cmdr;
                    if (alias.expedition) {
                        output += " for " + alias.expedition;
                    } 
                }
                return utils.sendMessage(bot, msg.channel, output);
            }
            return utils.displayUsage(bot, msg, this);       
        }
    },
    "clear_cmdralias": {
        usage: "clear_cmdralias <alias>",
        adminOnly: true,
        help: "Deletes a CMDR alias.",
        process: function(args, bot, msg) {
            var alias = args[1].toLowerCase();
            if(alias) {
                if (edsm.cmdraliases[alias]) {
                    delete edsm.cmdraliases[alias];
                    writeCmdrAliases();
                    return utils.sendMessage(bot, msg.channel, "Deleted CMDR alias " + alias);
                } else {
                    return utils.sendMessage(bot, msg.channel, "Sorry, " + alias + " doesn't exist.");
                }
            }
            return utils.displayUsage(bot, msg, this);
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
            return utils.sendMessages(bot,msg.channel,outputArray);
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
                    return utils.sendMessage(bot, msg.channel,output);
                } else {
                    return utils.displayUsage(bot,msg,this);
                }
            }
            return utils.displayUsage(bot, msg, this);
        }
    },
    "show_sysalias": {
        usage: "show_sysalias <alias>",
        help: "Displays a system alias.",
        process: function(args, bot, msg) {
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
                return utils.sendMessage(bot, msg.channel, output);
            }
            return utils.displayUsage(bot, msg, this);       
        }
    },
    "clear_sysalias": {
        usage: "clear_sysalias <alias>",
        adminOnly: true,
        help: "Deletes a system alias.",
        process: function(args, bot, msg) {
            var system = utils.compileArgs(args);
            if(system) {
                if (edsm.aliases[system.toLowerCase()]) {
                    delete edsm.aliases[system.toLowerCase()];
                    writeAliases();
                    return utils.sendMessage(bot, msg.channel, "Deleted system alias " + system);
                } else {
                    return utils.sendMessage(bot, msg.channel, "Sorry, " + system + " doesn't exist.");
                }
            }
            return utils.displayUsage(bot, msg, this);
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
            return utils.sendMessages(bot,msg.channel,outputArray);
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
                        return utils.sendMessage(bot, msg.channel, "Assigned " + query[0] + " to " + query[1]);
                    } else {
                        return utils.sendMessage(bot, msg.channel, query[0] + " is not in my records.")
                    }
                }
            }
            return utils.displayUsage(bot, msg, this);
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
                            return utils.displayUsage(bot, msg, this);
                        } else if (alias.error) {
                            return utils.sendMessage(bot, msg.channel, alias.message);
                        } else {
                            return utils.sendMessage(bot, msg.channel,"Created alias " + alias.alias + " in expedition " + query[1]);
                        }
                    } else {
                        if (botcfg.aliases[query[0].toLowerCase()]) {
                            botcfg.aliases[query[0].toLowerCase()].expedition = query[1];
                            botcfg.writeAliases();
                            return utils.sendMessage(bot, msg.channel, "Assigned " + query[0] + " to " + query[1]);
                        } else {
                            return utils.sendMessage(bot, msg.channel, query[0] + " is not in my records.")
                        }
                    }
                }
            }
            return utils.displayUsage(bot, msg, this);
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
                    aliasArray.sort();
                }


                i = 0;
                var cmdrAliasArray = [];
                for (key in edsm.cmdraliases) {
                    if (edsm.cmdraliases[key].expedition && edsm.cmdraliases[key].expedition.toLowerCase() === expedition.toLowerCase()) {
                        cmdrAliasArray[i++] = "\t" + edsm.cmdraliases[key].alias + " -> " + edsm.cmdraliases[key].cmdr;
                    }                
                }                
                if (cmdrAliasArray.length > 0) {
                    cmdrAliasArray.sort();
                }
                

                i = 0;
                var sysaliasArray = [];
                for (key in edsm.aliases) {
                    if (edsm.aliases[key].expedition && edsm.aliases[key].expedition.toLowerCase() === expedition.toLowerCase()) {
                        sysaliasArray[i++] = "\t" + edsm.aliases[key].alias + " -> " + edsm.aliases[key].system;
                    }                
                }
                if (sysaliasArray.length > 0) {
                    sysaliasArray.sort();
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

                    return utils.sendMessages(bot,msg.channel,outputArray);
                } else {
                    return utils.sendMessage(bot, msg.channel, expedtition + " is an empty expedition");
                }
            }
            return utils.displayUsage(bot, msg, this);    
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
            explist.sort();
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
            return utils.sendMessages(bot,msg.channel,outputArray);
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
