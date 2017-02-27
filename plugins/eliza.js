'use strict';

var utils = require('../server/utils.js');
var elizabot = require('./elizabot.js');

var commands = {
    "elizastart": {
        help: "Start a new conversation",
        process: function(args, bot, message) { startEliza(args, bot, message); }
    },
    "elizabye": {
        help: "Done with your conversation with the bot",
        process: function(args, bot, message) { endEliza(args, bot, message); }
    },
    "eliza": {
        usage: "eliza <anything - just talk>",
        help: "Let's talk...",
        process: function(args, bot, message) {
            if (!elizaStarted) {
                elizaStarted = true;
            }
            utils.sendMessage(bot, message.channel, elizabot.reply(utils.compileArgs(args)));
        }
    },
};

exports.findCommand = function(command) {
    return commands[command];
}

exports.commands = commands;

var elizaStarted = false;

var startEliza = function(args, bot, message) {
    if (elizaStarted) {
        utils.sendMessage(bot, message.channel, elizabot.bye());
    }
    utils.sendMessage(bot, message.channel, elizabot.start());
    elizaStarted = true;
}

var endEliza = function(args, bot, message) {
    utils.sendMessage(bot, message.channel, elizabot.bye());
    elizaStarted = false;
}