// Rivescript-Discordbot bridge
'use strict';

var path = require('path');
var base = require(path.resolve(__dirname, '../base.js'));
var utils = require(path.resolve(base.path, 'server/utils.js'));
var rs_host = require(path.resolve(base.path, 'plugins/rs_host.js'));

exports.RSBridge = RSBridge;
function RSBridge(userDataDir, memoryPrefix, options) {
    this.RSHost = new rs_host.RSHost(userDataDir, memoryPrefix, options);
    this.messageCache = {}; // For callback purposes
}

RSBridge.prototype.setup = function(config, bot, botcfg, prefix, rivescriptArray) {
    this.sinBot = botcfg.sinBot;
    if (config) {
        if (config.allowTTS) {
            allowTTS = config.allowTTS;
        }
    }

    // This hooks up the command path from the rivescript interpreter back out to the bot
    this.RSHost.setSubroutine("sinbot", function(rs, input) {
        // Get the last message sent by that user to jaques. That will be the context for this command.
        var message = this.messageCache[rs.currentUser()];
        // We'll use forceProcCommand to avoid having to deal with the command prefix...
        message.content = input.join(" ").trim();
        var res = this.sinBot.compileCommand(true, input);
        this.sinBot.handleCommand(bot, res, message);
        // We can return something to Jaques, but we aren't doing that here.
        // return "Return value!";
    });

    return this.RSHost.setup(rivescriptArray);
}

// PMs the last few snippets of conversation between people and Jaques to the caller. For debugging the bot.
RSBridge.prototype.gossip = function(args, bot, message) {
    return utils.sendMessages(bot, message.author, rs_host.gossip());
}

// Talk to the bot
RSBridge.prototype.reply = function(args, bot, message) {
    var that = this;
    return new Promise(function(resolve, reject) {
        var statement = utils.compileArgs(args);
        var userid = message.author.id;
        that.messageCache[userid] = message;
        that.RSHost.reply(statement, message.author.name, userid)
        .then(function(reply) {
            reply = that.RSHost.stripGarbage(reply); 
            var useTTS = false;
            // Users can set usetts for themselves, or serverwide if we allow it
            // if (allowTTS || message.channel.type === "dm") {
            //     var ttsVar = this.RSHost.getUservar(userid, "usetts");
            //     if (ttsVar == "true") {
            //         useTTS = true;
            //     }
            // }
            if (useTTS) {
                utils.ttsMessage(bot, message.channel, reply).then(resolve);
            } else {
                utils.sendMessage(bot, message.channel, reply).then(resolve);
            }
        });
    });       
}

