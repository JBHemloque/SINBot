// Rivescript-Discordbot bridge
'use strict';

const path = require('path');
const base = require(path.resolve(__dirname, '../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));
const rs_host = require(path.resolve(base.path, 'plugins/rs_host.js'));

///////////////////////////////////////////////////////////////////////////////
//
// Options: {
//     userDataDir: string,
//     memoryPrefix: string,
//     rsOptions: string
// }
///////////////////////////////////////////////////////////////////////////////

var messageCache = {};    // Global message cache for callback purposes
var sinBot;
var discordBot;

exports.RSBridge = RSBridge;
function RSBridge() {
}

RSBridge.prototype.setup = function(config, bot, botcfg, userDataDir, memoryPrefix, rsOptions, rivescriptArray) {
    this.config = config;
    this.userDataDir = userDataDir;
    this.memoryPrefix = memoryPrefix;
    this.rsOptions = rsOptions;
    sinBot = botcfg.sinBot;
    discordBot = bot;
    
    this.RSHost = new rs_host.RSHost(this.userDataDir, this.memoryPrefix, this.rsOptions);    

    // This hooks up the command path from the rivescript interpreter back out to the bot
    this.RSHost.setSubroutine("sinbot", this.subroutineHandler);

    return this.RSHost.setup(rivescriptArray);
}

RSBridge.prototype.subroutineHandler = function(rs, input) {
    // Get the last message sent by that user to jaques. That will be the context for this command.
    var message = messageCache[rs.currentUser()];
    // We'll use forceProcCommand to avoid having to deal with the command prefix...
    message.content = input.join(" ").trim();
    var res = sinBot.compileCommand(true, input);
    sinBot.handleCommand(discordBot, res, message);
    // We can return something to Jaques, but we aren't doing that here.
    // return "Return value!";
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
        messageCache[userid] = message;
        that.RSHost.reply(statement, message.author.username, userid)
        .then(function(reply) {
            utils.sendMessage(bot, message.channel, reply).then(resolve);
        });
    });       
}

