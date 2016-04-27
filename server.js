'use strict';

var bot = require('./bot.js');
var Discord = require("discord.js");
var config = require('./config.js');
var utils = require('./utils.js');

var SINBot = new Discord.Client();

SINBot.on("message", function(message){
	bot.procCommand(SINBot, message);
});

//Log user status changes
SINBot.on("presence", function(user,status,gameId) {
	bot.procPresence(SINBot, user, status, gameId);
});

SINBot.on('disconnected', function() {
	utils.logError("Disconnected", "Attempting restart...");
    startBot();
});

function startBot() {
	SINBot.login(config.LOGIN, config.PASSWORD, function(error, token) {
		if (error) {
			utils.logError("Error logging in: " + error);
		}
		if (token) {
			console.log(version + " logged in with token " + token);
		}
	});

	bot.startBot(SINBot, config);
}

startBot();
