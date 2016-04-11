'use strict';

var utils = require('../utils.js');
var http = require("http");

var commands = {
	"randomcat": {
		help: "Rough day? Comfort someone with this command.",
		process: function(args, bot, message) { 
			var request = http.get("http://random.cat/meow", function (response) {
				// data is streamed in chunks from the server
			    // so we have to handle the "data" event    
			    var buffer = "", 
			        data,
			        route;

			    response.on("data", function (chunk) {
			        buffer += chunk;
			    }); 

			    response.on("end", function (err) {
			        // finished transferring data
			        // dump the raw data
			        console.log(buffer);
			        console.log("\n");
			        try {
				        data = JSON.parse(buffer);
				        if (data && data.file) {
				        	bot.sendMessage(message.channel, data.file);
				        }
				    } catch (e) {
						console.log("Error calling randomcat:");
						console.log(e);
					}
			    }); 
			});
		}
	},
};

exports.commands = commands;

exports.findCommand = function(command) {
	return commands[command];
}