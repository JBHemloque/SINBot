'use strict';

var async = require('async');

exports.compileArgs = function(args) {
	args.splice(0,1);
	return args.join(" ");
}

exports.displayUsage = function(bot, message, command) {
	if (command.usage) {
		bot.sendMessage(message.channel, "Usage: " + command.usage);
	}
}

exports.sendMessages = function(bot, message, outputArray) {
	async.forEachSeries(outputArray, function(output, callback) {
		var cb = callback;
		bot.sendMessage(message.channel, output, function(error, message) {
			if (error) {
				console.log(error);
			}
			cb();
		})
	}, function(err) {
		if (err) {
			console.log(err);
		}
	});
}

// sort on values
exports.srt = function(desc) {
	return function(a,b){
		return desc ? ~~(a < b) : ~~(a > b);
	};
}

// sort on key values
exports.keysrt = function(key,desc) {
	return function(a,b){
		return desc ? ~~(a[key] < b[key]) : ~~(a[key] > b[key]);
	}
}