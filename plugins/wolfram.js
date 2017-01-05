'use strict';

var utils = require('../server/utils.js');

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
							var output = [];
							var res = result[0];
							for (var i = 0; i < result.length; i++) {
								if (result[i].primary === true) {
									res = result[i];
								}
							}
							output.push(res.title);
							for (var j = 0; j < res.subpods.length; j++) {
								if (res.subpods[j].text) {
									output.push(res.subpods[j].text);
								} else if (res.subpods[j].image) {
									output.push(res.subpods[j].image);
								}
							}
							if (output.length == 0) {
								output.push("I'm sorry, I don't know the answer to that.");
							}
							utils.sendMessages(bot, message.channel, output);
						} else {
							bot.sendMessage(message.channel, "I'm sorry, I don't know the answer to that.");
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