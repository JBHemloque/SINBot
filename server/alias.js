'use strict';

var aliases;

try{
    console.log('  - Loading ' + path.resolve(base.path, "alias.json"));
    aliases = require(path.resolve(base.path, "alias.json"));
} catch(e) {
    //No aliases defined
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
    fs.writeFile(path.resolve(base.path, "alias.json"),JSON.stringify(aliases,null,2), null);
}

function makeAliasFromArgs(args, addExtrasCallback) {
    // Get rid of the command
    args.shift();
    var alias = args.shift();
    var output = args.join(" ");
    return makeAlias(alias, output, addExtrasCallback);
}
module.exports.makeAliasFromArgs = makeAliasFromArgs;

function makeAlias(alias, output, addExtrasCallback) {
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
	return aliases[id];
}
module.exports.getAlias = getAlias;

function getAliases() {
	return aliases;
}
module.exports.getAliases;

function clearAlias(alias) {
	if (getAlias(alias.alias)) {
		delete aliases[alias.alias];
    	writeAliases();
    	return true;
	}
	return false;
}