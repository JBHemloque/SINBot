'use strict';

const fs = require("fs");
const _ = require("underscore");
const request = require('request');
const path = require('path');
const base = require(path.resolve(__dirname, '../../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));
const edsm = require(path.resolve(base.path, 'server/elite/edsm.js'));
const regionjpg = require(path.resolve(base.path, 'server/elite/regionjpg.js'));
var regions;
const elitelib = require(path.resolve(base.path, 'server/elite/elitelib.js'));

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
module.exports.writeAliases = writeAliases;

function writeCmdrAliases() {
    fs.writeFile(path.resolve(base.path, "cmdralias.json"),JSON.stringify(edsm.cmdraliases,null,2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });
}
module.exports.writeCmdrAliases = writeCmdrAliases;

function writeCmdrs() {
    fs.writeFile(path.resolve(base.path, "cmdrs.json"),JSON.stringify(cmdrs,null,2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });
}
module.exports.writeCmdrs = writeCmdrs;

function generateRegionMapByCoords(location, callback) {
    console.log(`generateRegionMapByCoords(${location}, callback)`);
    edsm.getSystemCoordsAsync(location, function(sys) {
        console.log('getSystemCoordsAsync() returned ' + JSON.stringify(sys));
        if (sys && sys.coords) {
            var coords = sys.coords;
            // z is the Y coordinate looking down at the map
            regionjpg.fetchRegionMapByCoords(coords.x, coords.z, location, function(rgn) {
                callback(rgn);
            });
        } else {
            regionjpg.fetchRegionMap(location, callback);
        }
    });
}

var regionsLib = function() {
    if (!regions) {
        regions = require(path.resolve(base.path, 'server/elite/regions.js'));
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
module.exports.getRegionMap = getRegionMap;

async function getNormalizedRegionMap(region, callback) {
    var orgRegion = region;
    region = edsm.normalizeSystem(region);
    // EDSM wants spaces => %20, but our region map leaves them spaces, so...
    region = region.replace('%20', ' ');
    console.log(`Normalized region: ${region}`)
    getRegionMap(region, callback);
}
module.exports.getNormalizedRegionMap = getNormalizedRegionMap;

function getAuthorId(interaction) {
    if (interaction.user) {
        return interaction.user.globalName;
    }
    return undefined;
}
module.exports.getAuthorId = getAuthorId;

function getEdsmName(interaction) {
    var authorId = getAuthorId(interaction);
    if (authorId) {
        return cmdrs[authorId];
    }
    return undefined;
}
module.exports.getEdsmName = getEdsmName;

function getCmdrName(interaction) {
    var name = getEdsmName(interaction);
    if (!name) {
        name = getAuthorId(interaction);
    }
    return name;
}
module.exports.getCmdrName = getCmdrName;

function setEdsmName(authorId, edsmName) {
    if (authorId) {
        console.log('Register ' + authorId + ' as ' + edsmName);
        cmdrs[authorId] = edsmName;
        writeCmdrs();
        return `Registered as ${edsmName}`;
    } else {
        return "Sorry, an error occurred attempting to register your name";
    }
}
module.exports.setEdsmName = setEdsmName;

exports.normalizeSystem = function(system) {
    // We'll look in both the system alias list and the GMP database
    var key = system.toLowerCase();
    if (edsm.aliases[key]) {
        if (edsm.aliases[key].system) {
            return utils.sanitizeString(edsm.aliases[key].system)
        }
    }
    // var items = gmp.findGMPItems(system);
    // if (items.length == 1) {
    //     if (items[0].galMapSearch) {
    //         return items[0].galMapSearch;
    //     }
    // }
    return utils.sanitizeString(system);
}

