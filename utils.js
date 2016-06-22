'use strict';

var async = require('async');
var fs = require('fs');

exports.compileArgs = function(args) {
	args.splice(0,1);
	return args.join(" ").trim();
}

exports.bold = function(text) { 
	return "**" + text + "**";
}

exports.italic = function(text) {
	return "*" + text + "*";
}

exports.displayUsage = function(bot, message, command) {
	if (command.usage) {
		bot.sendMessage(message.channel, "Usage: " + command.usage);
	}
}

function countSubstrings(str, substr) {
	return str.split(substr).length-1;
}

exports.inBrief = function(longstring) {
	// Return only the first sentence in a long string, or the first line, whichever is shorter
	var lines = longstring.split("\n");
	var sentences = longstring.split(".");
	var ret = sentences[0];
	if (sentences[0].length > lines[0].length) {
		ret = lines[0];
	}
	// Close off any markup. Ideally we'd do this the right way and parse it. For now, what we really care about is **
	if (countSubstrings(ret, "**") % 2 == 1) {
		ret += "**";
	}
	return ret;
}

const MESSAGE_LIMIT = 800

exports.sendMessage = function(bot, channel, message) {
	// If the message is too big, let's split it...
	if (message.length > MESSAGE_LIMIT) {
		sendMessages(bot, channel, message.split(/\r?\n/));
	} else {
		bot.sendMessage(channel, message, function(error, message) {
			if (error) {
				logError("Error sending message", e);
			}
		});
	}
}

var sendMessages = function(bot, channel, outputArray) {
	// We've got an array of messages, but we might be able to compile them together.
	// Discord has a message size limit of about 2k, so we'll compile them together
	// in chunks no bigger than MESSAGE_LIMIT characters, for grins.
	var compiledArray = [];
	var i = 0;
	var buffer = "";
	for (var j = 0; j < outputArray.length; j++) {
		if (typeof outputArray[j] != 'function') {
			if (buffer.length + outputArray[j].length > MESSAGE_LIMIT) {
				compiledArray[i++] = buffer;
				buffer = "";
			}
			if (buffer.length > 0) {
				buffer += "\n";
			}
			buffer += outputArray[j];
		}
	}
	compiledArray[i++] = buffer;

	async.forEachSeries(compiledArray, function(output, callback) {
		var cb = callback;
		if (output) {
			bot.sendMessage(channel, output, function(error, message) {
				if (error) {
					logError("Error sending message", e);
				}
				cb();
			})
		} else {
			cb();
		}
	}, function(err) {
		if (err) {
			logError("Error sending messages - forEachSeries error", err);
		}
	});
}
exports.sendMessages = sendMessages;

exports.logError = function(header, error, callback) {
	var errors;
	try{
		errors = require("./errors.json");
	} catch(e) {
		errors = {};
	}

	var now = new Date().toLocaleString();
	var err = {
		timestamp: now,
		header: header,
		error: error
	};
	errors[now] = err;

	fs.writeFile("./errors.json",JSON.stringify(errors,null,2), null);
	console.log(now);
	console.log(header);
	console.log(error);
	if (callback) {
		callback(err);
	}
}