'use strict';

var bot = require('./bot.js');
var Discord = require("discord.js");
var config = require('../config.js');
var utils = require('./utils.js');
var base = require('../base.js');
var healthcheck = require('./healthcheck.js');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

var options = {};
if (config.DISCORD_OPTIONS) {
    options = config.DISCORD_OPTIONS;
}
console.log("Using discord options: " + JSON.stringify(options));
var SINBot = new Discord.Client(options);

console.log('Bot base directory: ' + base.path);

const eventsPath = path.join(__dirname, 'events');

console.log('Events path: ' + eventsPath);

const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        SINBot.once(event.name, (...args) => event.execute(...args));
    } else {
        SINBot.on(event.name, (...args) => event.execute(...args));
    }
}

SINBot.on("message", function(message){
    bot.procCommand(SINBot, message);
});

//Log user status changes
SINBot.on(Events.PresenceUpdate, function(user,status,gameId) {
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
