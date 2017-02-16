'use strict';

var utils = require('../server/utils.js');
var rs_bridge = require('./rs_bridge');

var commands = {
    "gossip": {
        adminOnly: true,
        help: "PMs the last few snippets of conversation between people and Jaques to the caller. For debugging the bot.",
        process: function(args, bot, message) {
            rsBridge.gossip(args, bot, message);
        }
    },
    "qohen": {
        usage: "<anything - just talk>",
        help: "I'm Qohen, your cyborg moderator. Have a drink!",
        process: function(args, bot, message) {
            rsBridge.reply(args, bot, message);
        }
    },
};

exports.findCommand = function(command) {
    return commands[command];
}

exports.commands = commands;

exports.setup = function(config, bot, botcfg) {
    rsBridge.setup(config, bot, botcfg, undefined, ['./plugins/rs/qohen', './plugins/rs/base']);
}

var rsBridge = new rs_bridge.RSBridge('./plugins/rs/');

