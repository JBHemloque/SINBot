'use strict';

var utils = require('../utils.js');
var RiveScript = require("rivescript");

var commands = {
	"jaques": {
		usage: "<anything - just talk>",
		help: "I'm Jaques, your cyborg bartender. Have a drink!",
		process: function(args, bot, message) {
			if (jaquesStarted) {				
				// We'll scope everything per-user...
				if (jaquesBot.getUservar(message.author.id, "name") == "undefined") {
					jaquesBot.setUservar (message.author.id, "name", message.author.name);
				}				
				bot.sendMessage(message.channel, jaquesBot.reply(message.author.id, utils.compileArgs(args)));
			} else {
				bot.sendMessage(message.channel, "Sorry I'm still waking up...");
			}
			
		}
	},
};

exports.findCommand = function(command) {
	return commands[command];
}

exports.commands = commands;

var jaquesStarted = false;

var jaquesBot = new RiveScript();

// Load a directory full of RiveScript documents (.rive files). This is for
// Node.JS only: it doesn't work on the web!
jaquesBot.loadDirectory("./plugins/jaques_rs", loading_done, loading_error);

// All file loading operations are asynchronous, so you need handlers
// to catch when they've finished. If you use loadDirectory (or loadFile
// with multiple file names), the success function is called only when ALL
// the files have finished loading.
function loading_done (batch_num) {   
    // Now the replies must be sorted!
    jaquesBot.sortReplies();

    console.log("Batch #" + batch_num + " has finished loading!");

    jaquesStarted = true;
}

// It's good to catch errors too!
function loading_error (error) {
	utils.logError("Error when loading files: " + error, error);
}