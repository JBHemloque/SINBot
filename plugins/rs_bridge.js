// Rivescript-Discordbot bridge
'use strict';

var rs_host = require('./rs_host.js');
var utils = require('../utils.js');

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

    this.RSHost.setSubroutine("sinbot", function(rs, input) {
        // Get the last message sent by that user to jaques. That will be the context for this command.
        var message = this.messageCache[rs.currentUser()];
        // We'll use forceProcCommand to avoid having to deal with the command prefix...
        console.log(JSON.stringify(input));
        message.content = input.join(" ").trim();
        var res = this.sinBot.compileCommand(true, input);
        this.sinBot.handleCommand(bot, res, message);
        // We can return something to Jaques, but we aren't doing that here.
        // return "Return value!";
    });

    this.RSHost.setup(rivescriptArray);
}

// PMs the last few snippets of conversation between people and Jaques to the caller. For debugging the bot.
RSBridge.prototype.gossip = function(args, bot, message) {
	utils.sendMessages(bot, message.author, rs_host.gossip());
}

// Talk to the bot
RSBridge.prototype.reply = function(args, bot, message) {				
	var statement = utils.compileArgs(args);
    var userid = message.author.id;
    this.messageCache[userid] = message;
    var reply = this.RSHost.reply(statement, message.author.name, userid);
	reply = this.RSHost.stripGarbage(reply); 
    var useTTS = false;
    // Users can set usetts for themselves, or serverwide if we allow it
    // if (allowTTS || message.channel.isPrivate) {
    //     var ttsVar = this.RSHost.getUservar(userid, "usetts");
    //     if (ttsVar == "true") {
    //         useTTS = true;
    //     }
    // }
    if (useTTS) {
        bot.sendMessage(message.channel, reply, {tts:true});
    } else {
        bot.sendMessage(message.channel, reply);
    }
}

