'use strict';

var async = require('async');
var fs = require('fs');
var config = require('../config.js');

exports.compileArgs = function(args) {
    args.splice(0,1);
    return args.join(" ").trim();
}

exports.bold = function(text) { 
    return "**" + text + "**";
}

exports.italic = function(text) {
    return "*" + text + "*";
}

function countSubstrings(str, substr) {
    return str.split(substr).length-1;
}

exports.inBrief = function(longstring) {
    // Return only the first sentence in a long string, or the first line, whichever is shorter
    var lines = longstring.split("\n");
    var sentences = longstring.split(".");
    var ret = sentences[0];
    if (sentences[0].length > lines[0].length) {
        ret = lines[0];
    }
    // Close off any markup. Ideally we'd do this the right way and parse it. For now, what we really care about is **
    if (countSubstrings(ret, "**") % 2 == 1) {
        ret += "**";
    }
    return ret;
}

const MESSAGE_LIMIT = 800

var sendMessageToServerAndChannel = function(bot, server, channel, msg, callback){
    if (channel.startsWith("#")) {
        channel = channel.substr(1);
    }
    var channels = bot.channels;
    var ch = bot.channels.get("name",channel);
    if (server) {
        var svr = bot.servers.get("id", server);
        if (svr) {
            ch = svr.channels.get("name",channel);
        }
    }
    
    if (ch) {
        console.log("sendMessageToServerAndChannel(" + ch.name + " [" + ch.id + "], " + msg);
        ch.sendMessage(msg, callback);
    } else {
        console.log("sendMessageToServerAndChannel() couldn't find a channel called #" + channel);
    }
}
exports.sendMessageToServerAndChannel = sendMessageToServerAndChannel;

var sendMessage = function(bot, channel, message) {
    // If the message is too big, let's split it...
    if (message.length > MESSAGE_LIMIT) {
        sendMessages(bot, channel, message.split(/\r?\n/));
    } else {
        channel.sendMessage(message, function(error, message) {
            if (error) {
                logError("Error sending message", e);
            }
        });
    }
}
exports.sendMessage = sendMessage;

var ttsMessage = function(bot, channel, message) {
    // If the message is too big, let's split it...
    if (message.length > MESSAGE_LIMIT) {
        sendMessages(bot, channel, message.split(/\r?\n/), true);
    } else {
        channel.sendMessage(message, {tts:true}, function(error, message) {
            if (error) {
                logError("Error sending message", e);
            }
        });
    }
}
exports.ttsMessage = ttsMessage;

var pmOrSendChannel = function(command, pmIfSpam, user, channel) {
    if (command.spammy && pmIfSpam) {
        return user; // PM
    }
    return channel;
}
exports.pmOrSendChannel = pmOrSendChannel;

// Send the message to the channel, or via PM if both command.spammy and pmIfSpam are true
var pmOrSend = function(bot, command, pmIfSpam, user, channel, message) {
    sendMessage(bot, pmOrSendChannel(command, pmIfSpam, user, channel), message);
}
exports.pmOrSend = pmOrSend;

var sendMessages = function(bot, channel, outputArray, tts) {
    // We've got an array of messages, but we might be able to compile them together.
    // Discord has a message size limit of about 2k, so we'll compile them together
    // in chunks no bigger than MESSAGE_LIMIT characters, for grins.
    var compiledArray = [];
    var i = 0;
    var buffer = "";
    for (var j = 0; j < outputArray.length; j++) {
        if (outputArray[j]) {
            if (typeof outputArray[j] != 'function') {
                if (buffer.length + outputArray[j].length > MESSAGE_LIMIT) {
                    compiledArray[i++] = buffer;
                    buffer = "";
                }
                if (buffer.length > 0) {
                    buffer += "\n";
                }
                buffer += outputArray[j];
            }
        }       
    }
    compiledArray[i++] = buffer;

    async.forEachSeries(compiledArray, function(output, callback) {
        var cb = callback;
        if (output) {
            if (tts) {
                channel.sendMessage(output, {tts:true}, function(error, message) {
                    if (error) {
                        logError("Error sending message", e);
                    }
                    cb();
                })
            } else {
                channel.sendMessage(output, function(error, message) {
                    if (error) {
                        logError("Error sending message", e);
                    }
                    cb();
                });
            }
        } else {
            cb();
        }
    }, function(err) {
        if (err) {
            logError("Error sending messages - forEachSeries error", err);
        }
    });
}
exports.sendMessages = sendMessages;

// Send the message to the channel, or via PM if both command.spammy and pmIfSpam are true
var pmOrSendArray = function(bot, command, pmIfSpam, user, channel, messages) {
    sendMessages(bot, pmOrSendChannel(command, pmIfSpam, user, channel), messages, function(error, message) {
        if (error) {
            logError("Error sending message", e);
        }
    }); 
}
exports.pmOrSendArray = pmOrSendArray;

exports.displayUsage = function(bot, message, command) {
    // Usage is always spammy
    if (command.usage) {
        var channel = message.channel;
        if (config.SPAMMY_PM) {
            channel = message.author;
        }
        channel.sendMessage("Usage: " + command.usage);
    }
}

exports.logError = function(header, error, callback, debug) {
    var errors;
    try{
        errors = require("./errors.json");
    } catch(e) {
        errors = {};
    }

    if (!debug) {
        debug = console.log;
    }

    var now = new Date().toLocaleString();
    var err = {
        timestamp: now,
        header: header,
        error: error
    };
    errors[now] = err;

    fs.writeFile("./errors.json",JSON.stringify(errors,null,2), null);
    debug(now);
    debug(header);
    debug(error);
    if (callback) {
        callback(err);
    }
}

exports.sanitizeString = function(input) {
    return input.replace(/ /g, "%20").replace(/\+/g, "%2B").replace(/\'/g, "%27");
}

exports.desanitizeString = function(input) {
    return input.replace(/\%20/g, " ").replace(/\%2B/g, "+").replace(/\%27/g, "'");
}

exports.userName = function(user) {
    if (user.nickname) {
        return user.nickname;
    }
    return user.user.username;
}