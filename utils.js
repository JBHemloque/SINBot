'use strict';

var async = require('async');

exports.compileArgs = function(args) {
	args.splice(0,1);
	return args.join(" ");
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

exports.inBrief = function(longstring) {
	// Return only the first sentence in a long string, or the first line, whichever is shorter
	var lines = longstring.split("\n");
	var sentences = longstring.split(".");
	if (sentences[0].length > lines[0].length) {
		return lines[0];
	}
	return sentences[0];
}

exports.sendMessages = function(bot, message, outputArray) {
	// We've got an array of messages, but we might be able to compile them together.
	// Discord has a message size limit of about 2k, so we'll compile them together
	// in chunks no bigger than 800 characters, for grins.
	var compiledArray = [];
	var i = 0;
	var buffer = "";
	for (var j = 0; j < outputArray.length; j++) {
		if (typeof outputArray[j] != 'function') {
			if (buffer.length + outputArray[j].length > 800) {
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
			bot.sendMessage(message.channel, output, function(error, message) {
				if (error) {
					console.log("Error sending message");
					console.log(error);
				}
				cb();
			})
		} else {
			cb();
		}
	}, function(err) {
		if (err) {
			console.log("Error sending messages - forEachSeries error");
			console.log(err);
		}
	});
}