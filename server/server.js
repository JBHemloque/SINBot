'use strict';

var bot = require('./bot.js');
var Discord = require("discord.js");
var config = require('../config.js');
var utils = require('./utils.js');

var SINBot = new Discord.Client();

// the ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted.
SINBot.on('ready', function() {
      console.log('I am ready!');
});

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
    SINBot.login(config.TOKEN).then(atoken => console.log('logged in with token ' + atoken)).catch(console.error);

    bot.startBot(SINBot, config);
}

startBot();
