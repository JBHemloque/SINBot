'use strict';

const path = require('path');
const base = require(path.resolve(__dirname, '../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));
const rs_bridge = require(path.resolve(base.path, 'plugins/rs_bridge.js'));
const RedisSessionManager = require("rivescript-redis");

var commands = {
    "gossip": {
        adminOnly: true,
        help: "PMs the last few snippets of conversation between people and Jaques to the caller. For debugging the bot.",
        process: function(args, bot, message) {            
            return this.rsBridge ? this.rsBridge.gossip(args, bot, message) : utils.emptyPromise();
        }
    },
    "jaques": {
        usage: "jaques <anything - just talk>",
        help: "I'm Jaques, your cyborg bartender. Have a drink!",
        process: function(args, bot, message) {
            return this.rsBridge ? this.rsBridge.reply(args, bot, message) : utils.emptyPromise();
        }
    },
};

exports.findCommand = function(command) {
    return commands[command];
}

exports.commands = commands;

exports.setup = function(config, bot, botcfg) {
    var options = {
        utf8: true
    };
    if (config.redishost) {
        options['sessionManager'] = new RedisSessionManager({
            host: config.redishost,
            port: config.redisport,
            prefix: config.redisprefix ? config.redisprefix : 'rivescript/'
        });
    }

    this.rsBridge = new rs_bridge.RSBridge(
        config, 
        bot, 
        botcfg, 
        path.resolve(base.path, 'plugins/rs/'),
        undefined,
        options        
    );
    this.rsBridge.setup([path.resolve(base.path, 'plugins/rs/jaques'), path.resolve(base.path, 'plugins/rs/base')])
    .then(function() {
        utils.debugLog("Jaques is ready!");
    });
}

