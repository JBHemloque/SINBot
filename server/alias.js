'use strict';

var base = require('../base.js');
var path = require('path');
var utils = require('./utils.js');
var _ = require("underscore");
var fs = require("fs");

var aliases;

var aliasPath = path.resolve(base.path, "alias.json");

try{
    utils.debugLog('  - Loading ' + aliasPath);
    aliases = require(aliasPath);
} catch(e) {
    //No aliases defined
    console.log("Could not load aliases...");
    aliases = {};
}


function makeAliasStruct(alias, output) {
    return {alias: alias, output: output};
}

function makeAliasStructFromArgs(args) {
    // Get rid of the command
    args.shift();
    var alias = args.shift();
    var output = args.join(" ");
    return makeAliasStruct(alias, output);
}

function writeAliases() {
    fs.writeFile(aliasPath,JSON.stringify(aliases,null,2), null, function(err) {
        if (err) {
            console.log("Error writing alias file: " + err);
        }
    });
}

function makeAliasFromArgs(args, findCommand, addExtrasCallback) {
    // Get rid of the command
    args.shift();
    var alias = args.shift();
    var output = args.join(" ");
    return makeAlias(alias, output, findCommand, addExtrasCallback);
}
module.exports.makeAliasFromArgs = makeAliasFromArgs;

function makeAlias(alias, output, findCommand, addExtrasCallback) {
    var aliasStruct = makeAliasStruct(alias, output);
    if (aliasStruct.alias && aliasStruct.output) {
        var command = findCommand(aliasStruct.alias);
        if (command) {
            return {error: true, message: "Sorry, " + aliasStruct.alias + " is a command."};
        } else {
            if (addExtrasCallback) {
                addExtrasCallback(aliasStruct);
            }
            var key = aliasStruct.alias.toLowerCase();
            if (aliases[key]) {
                var item = aliases[key];
                _.extend(item, aliasStruct);
                aliases[key] = item;
            } else {
                aliases[key] = aliasStruct;
            }
            //now save the new alias
            writeAliases();        
            return aliasStruct;
        }
    } else {
        return {displayUsage: true};
    }
}
module.exports.makeAlias = makeAlias;

function getAlias(id) {
    // console.log("Looking for alias " + id);
    var alias = aliases[id];
    // console.log(JSON.stringify(alias));
	return aliases[id];
}
module.exports.getAlias = getAlias;

function getAliases() {
    var i = 0;
    var outputArray = [];
    outputArray[i++] = "Aliases:";
    var hasAliases = false;
    var key;
    for (key in aliases) {
        outputArray[i++] = "\t" + key + " -> " + utils.inBrief(aliases[key].output);
        hasAliases = true;
    }
    if (!hasAliases) {
        outputArray[0] += " None"
    }
	return outputArray;
}
module.exports.getAliases = getAliases;

function clearAlias(alias) {
	if (getAlias(alias.alias)) {
		delete aliases[alias.alias];
    	writeAliases();
    	return true;
	}
	return false;
}
module.exports.clearAlias = clearAlias;