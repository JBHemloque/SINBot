'use strict';

var utils = require('../utils.js');
var RiveScript = require("rivescript");

var lastMessages = [];

var commands = {
	"gossip": {
		adminOnly: true,
		help: "PMs the last few snippets of conversation between people and Jaques to the caller. For debugging the bot.",
		process: function(args, bot, message) {
			var msgs = [];
			for (var i = 0; i < lastMessages.length; i++) {
				msgs.push(lastMessages[i].user + " said: " + lastMessages[i].statement);
				msgs.push("And the bot said: " + lastMessages[i].reply);
			}
			utils.sendMessages(bot, message.author, msgs);
		}
	},
	"jaques": {
		usage: "<anything - just talk>",
		help: "I'm Jaques, your cyborg bartender. Have a drink!",
		process: function(args, bot, message) {
			if (jaquesStarted) {				
				// We'll scope everything per-user...
				if (jaquesBot.getUservar(message.author.id, "name") == "undefined") {
					jaquesBot.setUservar (message.author.id, "name", message.author.name);
				}				
				var statement = utils.compileArgs(args);
				var reply = stripGarbage(jaquesBot.reply(message.author.id, statement));
				var cache = {user: message.author.name, statement: statement, reply: reply};
				lastMessages.push(cache);
				while (lastMessages.length > 10) {
					lastMessages.shift();
				}
				bot.sendMessage(message.channel, reply);
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

// These functions are gross, but I don't know why I'm seeing garbage in the reply strings. This will take care of them for now...
function __stripGarbage(text, patt, repl) {
    while (text.includes(patt)) {
        text = text.replace(patt, repl);
    } 
    return text;
}

function _stripGarbage(text, toStrip) {
    var strip = [
        {patt: ". " + toStrip + ".", repl: "."},
        {patt: "! " + toStrip + ".", repl: "!"},
        {patt: "? " + toStrip + ".", repl: "?"},
        {patt: ". " + toStrip, repl: "."},
        {patt: "! " + toStrip, repl: "!"},
        {patt: "? " + toStrip, repl: "?"}
    ];

    for (var i = 0; i < strip.length; i++) {
        text = __stripGarbage(text, strip[i].patt, strip[i].repl);
    }
    return text;
}

function stripGarbage(text) {
    // Some strings end in "  random" or "  inquiry". Strip these. There may be multiples, but they don't seem to mix.
    text = __stripGarbage(text, "  ", " ");
    text = _stripGarbage(text, "random");
    text = _stripGarbage(text, "inquiry");
    return text;
}
