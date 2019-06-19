'use strict';

var path = require('path');
var base = require(path.resolve(__dirname, '../base.js'));
var utils = require(path.resolve(base.path, 'server/utils.js'));
var rs_bridge = require(path.resolve(base.path, 'plugins/rs_bridge.js'));

var commands = {
    "gossip": {
        adminOnly: true,
        help: "PMs the last few snippets of conversation between people and Jaques to the caller. For debugging the bot.",
        process: function(args, bot, message) {
            return rsBridge.gossip(args, bot, message);
        }
    },
    "jaques": {
        usage: "jaques <anything - just talk>",
        help: "I'm Jaques, your cyborg bartender. Have a drink!",
        process: function(args, bot, message) {
            return rsBridge.reply(args, bot, message);
        }
    },
};

exports.findCommand = function(command) {
    return commands[command];
}

exports.commands = commands;

exports.setup = function(config, bot, botcfg) {
    rsBridge.setup(config, bot, botcfg, undefined, [path.resolve(base.path, 'plugins/rs/jaques'), path.resolve(base.path, 'plugins/rs/base')]);
}

var rsBridge = new rs_bridge.RSBridge(path.resolve(base.path, 'plugins/rs/'));

