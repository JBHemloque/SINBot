'use strict';

var fs = require('fs');
var utils = require('../utils.js');

//////////////////////////
//
// Maintains sets of items that can be retrieved at random (e.g.: random cat, random spider, etc)
//
//////////////////////////

function findItem(array, item) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] === item) {
			return i;
		}
	}
	return -1;
}

function addOrReplace(array, item) {
	var i = findItem(array, item);
	if (i >= 0) {
		array[i] = item;
	}
	array.push(item);
}

var commands = { 
	"add_random": {
		usage: "<category> -> <item>",
		adminOnly: true,
		help: "Adds an item to a category for use ",
		extendedhelp: "Adds an item to a category for use - random will select an item at random from a set of categorized items - you might have a set of spider images, for instance.",
		process: function(args, bot, msg) {
			var query = utils.compileArgs(args).split("->");
			if (query.length >= 2) {
				query[0] = query[0].trim();
				query[1] = query[1].trim();
				if ((query[0].length > 0) && (query[1].length > 0)) {
					var cat = randomaliases[query[0].toLowerCase()];
					var output = "Added " + query[1] + " to category " + query[0] + ".";
					if (!cat) {
						cat = [];
					}
					if (findItem(cat, query[1]) >= 0) {
						output = "Updated " + query[1] + " in category " + query[0] + ".";
					}
					addOrReplace(cat, query[1]);
					randomaliases[query[0].toLowerCase()] = cat;
					writeRandomAliases();
					bot.sendMessage(msg.channel, output);
				} else {
					utils.displayUsage(bot,msg,this);
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	},
	"clear_random": {
		usage: "<category> -> <index of item to delete>",
		help: "Removes an item from a random category list",
		adminOnly: true,
		process: function(args, bot, msg) {
			var query = utils.compileArgs(args).split("->");
			if (query.length == 2) {
				var category = query[0].trim();
				var index = parseInt(query[1]);
				if ((index == NaN) || (index < 0)) {
					utils.displayUsage(bot,msg,this);
				} else {
					var cat = randomaliases[category.toLowerCase()];
					if (cat) {
						if (index >= cat.length) {
							bot.sendMessage(msg.channel, category + " has no item " + index);
						} else {
							cat.splice(index, 1);
							randomaliases[category.toLowerCase()] = cat;
							writeRandomAliases();
							bot.sendMessage(msg.channel, "Removed item " + index + " from " + category);
						}
					} else {
						bot.sendMessage(msg.channel, category + " is an empty category");
					}
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}	
		}
	},
	"random_list": {
		usage: "<category>",
		help: "Lists everything associated with a category.",
		process: function(args, bot, msg) {
			if (args.length > 1) {
				var category = utils.compileArgs(args).trim();
				var cat = randomaliases[category.toLowerCase()];
				
				if (cat && cat.length) {
					var i = 0;
					var outputArray = [];
					outputArray[i++] = utils.bold(category) + ":";

					for (var j = 0; j < cat.length; j++) {
						outputArray[i++] = "\t" + cat[j];
					}
					utils.sendMessages(bot,msg,outputArray);
				} else {
					bot.sendMessage(msg.channel, category + " is an empty category");
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}	
		}
	},
	"random_categories": {
		help: "Lists categories.",
		process: function(args, bot, msg) {
			var i = 0;
			var outputArray = [];
			var categories = [];						
			for (var key in randomaliases) {
				categories[i++] = key;
			}			
			i = 0;
			outputArray[i++] = utils.bold("Categories for random:");
			if (categories.length > 0) {
				categories.sort();
				// TODO: Why won't this sort?
				// categories.sort(alphanum.alphanumCase);
				for (var j = 0; j < categories.length; j++) {
					outputArray[i++] = categories[j];
				}
			} else {
				outputArray[0] += " None";
			}
			utils.sendMessages(bot,msg,outputArray);
		}
	},
	"random": {
		usage: "<category>",
		help: "Return a random item in a category",
		process: function(args, bot, msg) {
			if (args.length > 1) {
				var category = utils.compileArgs(args).trim();
				var cat = randomaliases[category.toLowerCase()];
				if (cat && cat.length) {
					// Get a random index into it
					var i = Math.floor((Math.random() * cat.length));
					if (cat[i]) {
						bot.sendMessage(msg.channel, cat[i]);
					} else {
						bot.sendMessage(msg.channel, "Error: Invalid item " + i + " in category " + category);
					}
				} else {
					bot.sendMessage(msg.channel, category + " is an empty category");
				}
			} else {
				utils.displayUsage(bot,msg,this);
			}
		}
	}
};

exports.commands = commands;

exports.findCommand = function(command) {
	return commands[command];
}

var randomaliases;

try{
	randomaliases = require("../randomalias.json");
} catch(e) {
	//No randomaliases defined
	randomaliases = {};
}

function writeRandomAliases() {
	fs.writeFile("./randomalias.json",JSON.stringify(randomaliases,null,2));
}