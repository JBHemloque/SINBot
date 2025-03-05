'use strict';

var bot = require('./bot.js');
const { Client, Events, GatewayIntentBits } = require('discord.js');
var config = require('../config.js');
var utils = require('./utils.js');
var base = require('../base.js');
var healthcheck = require('./healthcheck.js');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});


var SINBot = new Client(
    { 
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.MessageContent
        ]
    }
);

console.log('Bot base directory: ' + base.path);

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
    healthcheck.startHealthCheck(SINBot);
    SINBot.login(config.TOKEN)
        .then(atoken => {
            console.log('logged in with token ' + atoken);
            try {
                bot.startBot(SINBot, config, function() {
                    console.log("Bot initialization complete!");
                });
            } catch (e) {
                utils.logError("startBot error", e);
            }
        })
        .catch(console.error);
}

function consoleBotInput(consoleBot) {
    readline.question(`Bot: `, (input) => {
  
      var message = {
        author: {username: 'User'},
        channel: 'Channel',
        sender: {username: 'Sender'},
        content: input,
        isMentioned: function(user) { return false; }
    };

        bot.procCommand(consoleBot, message);

        // readline.close();
        consoleBotInput(bot);
    });
}

function consoleBot() {
    var botUser = {username: 'Console Bot'};
    var consoleBot = {user: botUser};
    bot.startBot(SINBot, config, function() {
        console.log("Bot initialization complete!");
        consoleBotInput(consoleBot);
    });
}

if (config.CONSOLE) {
    consoleBot();
} else {
    startBot();
}
