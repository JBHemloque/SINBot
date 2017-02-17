'use strict';

var request = require('request');
var fs = require("fs");
var path = require('path');
var base = require(path.resolve(__dirname, '../../base.js'));
var utils = require(path.resolve(base.path, 'server/utils.js'));
var edsm = require(path.resolve(base.path, 'plugins/elite/edsm.js'));

var gmpData = [];
try{
    // We're in the plugin directory, but this is written in the context of the server, one directory down...
    console.log('  - Loading ' + path.resolve(base.path, "gmp-edd.json"));
    gmpData = require(path.resolve(base.path, 'gmp-edd.json'));
} catch(e) {
    //No aliases defined
    gmpData = [];
}
var writeGmpData = function() {
    fs.writeFile(path.resolve(base.path, "gmp-edd.json"),JSON.stringify(gmpData,null,2), null);
}
exports.writeGmpData = writeGmpData;

var hasGmpData = function() {
    return (gmpData && gmpData.length > 0);
}
exports.hasGmpData = hasGmpData;

var refreshGmpData = function(callback) {
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
exports.refreshGmpData = refreshGmpData;

const GMP_SUPPORTED_TYPES = {
    'planetaryNebula'        : 'Planetary Nebula',
    'nebula'                : 'Nebula',
    'blackhole'                : 'Black Hole',
    'historicalLocation'    : 'Historical Location',
    'stellarRemnant'        : 'Stellar Remnant',
    'minorPOI'                : 'Minor POI',
    'explorationHazard'        : 'Exploration Hazard',
    'starCluster'            : 'Star Cluster',
    'pulsar'                : 'Neutron Star'
};
var getGmpType = function(baseType) {
    if (GMP_SUPPORTED_TYPES[baseType]) {
        return GMP_SUPPORTED_TYPES[baseType];
    }
    return 'Unknown type';
}
exports.getGmpType = getGmpType;

// Generate a report of all GMP exceptions within distance ly of coords. If coords is null, generate a report of everything.
var gmpExceptionReport = function(center, distance, bot, channel) {
    var gmp = gmpData;
    var msgArray = [];
    for (var i = 0; i < gmp.length; i++) {
        var item = gmp[i];
        if (GMP_SUPPORTED_TYPES[item.type]) {
            var itemString = "[" + item.id + "] " + item.name + " (" + GMP_SUPPORTED_TYPES[item.type] + ") -- " + item.galMapSearch + " -- ";
            var process = true;    // We can set this to false to indicate we should skip processing this item
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
        utils.sendMessage(bot, channel, "All data acceptable!");
    }
}
exports.gmpExceptionReport = gmpExceptionReport;

// Generate a report of all GMP exceptions within distance ly of coords. If coords is null, generate a report of everything.
var gmpPoiList = function(centerName, center, distance, bot, channel) {
    console.log('gmpPoiList(' + centerName + ', ' + center + ', ' + distance + ', bot, channel)');
    var header = "**GMP POI";
    if (center) {
        header += " within " + distance + " light years of " + centerName;
    }
    header += ":**";
    var gmp = gmpData;
    var msgArray = [];
    console.log("iterating gmp data...");
    for (var i = 0; i < gmp.length; i++) {
        var item = gmp[i];
        if (GMP_SUPPORTED_TYPES[item.type]) {
            var process = true;    // We can set this to false to indicate we should skip processing this item
            // If we have a center, calculate the distance between this item and that. 
            var itemDistance;
            if (center) {
                // We'll need to create a new coords structure for the item, since it's not in the same format as the rest of EDSM.
                // EDSM format is: "coords":{"x":X,"y":Y,"z":Z}
                // GMP format is: "coordinates": [-1259.84375,-177.4375,30270.28125]
                var coords = {x: item.coordinates[0], y: item.coordinates[1], z: item.coordinates[2]};
                console.log('calcing distance...');
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
        utils.sendMessage(bot, channel, header + " **No GMP POI matching**");
    }
}
exports.gmpPoiList = gmpPoiList;

var gmpItemMatch = function(item, query) {
    try {
        if (item.galMapSearch.toUpperCase().includes(query)) {
            return true;
        }
    } catch (e) {
        ;
        // console.log("Couldn't do the galmap search for [" + item.id + "]: " + e);
        // console.log(JSON.stringify(item));
    }
    try {
        if (item.name.toUpperCase().includes(query)) {
            return true;
        }
    } catch (e) {
        ;
        // console.log("Couldn't do the name search for [" + item.id + "]: " + e);
        // console.log(JSON.stringify(item));
    }
    return false;
}
exports.gmpItemMatch = gmpItemMatch;

var findGMPItems = function(query) {
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
exports.findGMPItems = findGMPItems;

// Always refresh the gmp data on load. We can also use this to refresh with a cron job...
console.log('  - Refreshing GMP data...');
refreshGmpData(function(msg) {
    if (msg) {
        console.log('  - Error refreshing GMP data: ' + msg);
    } else {
        console.log('  - Refreshing GMP data done!');
    }
})