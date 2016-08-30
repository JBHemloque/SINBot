'use strict';

var utils = require('../utils.js');

var wa = require('wolfram-alpha');
var wolfram;

var commands = {
	"wolfram": {
		usage: "<query>",
		help: "Query Wolfram Alpha",
		process: function(args, bot, message) { 
			if (args.length > 1) {
				var query = utils.compileArgs(args);
				wolfram.query(query, function(err, result) {
					console.log(JSON.stringify(result));
					if (err) {
						bot.sendMessage(message.channel, "Sorry, I could not query that...");
					}
					if (result) {
						if (result.length > 0) {
							var res = result[0];
							for (var i = 0; i < result.length; i++) {
								if (result[i].title = "Result") {
									res = result[i];
								}
							}
							var msg = "";
							if (res.subpods[0].text) {
								msg = res.subpods[0].text;
							}
							if (res.subpods[0].image) {
								if (msg.length > 0) {
									msg += "\n";
								}
								msg += res.subpods[0].image;
							}
							bot.sendMessage(message.channel, msg);
						}
					}
				});
			} else {
				utils.displayUsage(bot, message, this);
			}
		}
	},
};

exports.commands = commands;

exports.findCommand = function(command) {
	return commands[command];
}

exports.setup = function(config, bot, botcfg) {
	wolfram = wa.createClient(config.apiKey);
	console.log()
}