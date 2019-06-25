'use strict';

var async = require('async');
var fs = require('fs');
var config = require('../config.js');

exports.debugLog = function(message) {
    if (config.DEBUG) {
        console.log(message);
    }
}

exports.enumerate = function(obj) {
    var key;
    for (key in obj) {
        if (typeof obj[key] !== 'function') {
            console.log(key + ": " + obj[key]);
        }
    }
}

exports.emptyPromise = function() {
    return new Promise(function(resolve, reject) {
        resolve();
    });
}

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

exports.formatTimeDuration = function(diff) {
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -=  days * (1000 * 60 * 60 * 24);

    var hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);

    var mins = Math.floor(diff / (1000 * 60));
    diff -= mins * (1000 * 60);

    var seconds = Math.floor(diff / (1000));
    diff -= seconds * (1000);

    var output = [];
    if (days > 0) {
        output.push(days + " days");
    }
    if (hours > 0) {
        output.push(hours + " hours");
    }
    if (mins > 0) {
        output.push(mins + " minutes");
    }
    if (seconds > 0) {
        output.push(seconds + " seconds");
    }
    if (output.length === 0) {
        output.push(diff + " milliseconds");
    }
    return output.join(", ");
}

const MESSAGE_LIMIT = 800;

function _sendMessage(bot, channel, msg, tts) {
    if (config.CONSOLE) {
        var output = "[";
        output += channel;
        output += "] ";
        output += msg;
        debugLog(output);
        return emptyPromise();
    } else {
        var options = {tts:false};
        if (tts) {
            options.tts = true;
        }
        return channel.sendMessage(msg, Object.assign(options, channel));
    }
}

var sendMessageToServerAndChannel = function(bot, server, channel, msg, callback){
    if (channel.startsWith("#")) {
        channel = channel.substr(1);
    }    

    var channels = bot.channels;
    var ch = bot.channels.find("name",channel);
    if (server) {
        var svr = bot.guilds.get(server);
        if (svr) {
            ch = svr.channels.find("name",channel);
        }
    }

    if (ch) {
        // debugLog("sendMessageToServerAndChannel(" + ch.name + " [" + ch.id + "], " + msg);
        _sendMessage(bot, channel, msg, false).then(callback);
    } else {
        debugLog("sendMessageToServerAndChannel() couldn't find a channel called #" + channel);
    }
}
exports.sendMessageToServerAndChannel = sendMessageToServerAndChannel;

var sendMessage = function(bot, channel, message) {    
    // If the message is too big, let's split it...
    if (message.length > MESSAGE_LIMIT) {
        return sendMessages(bot, channel, message.split(/\r?\n/), false);
    } else {
        return _sendMessage(bot, channel, message, false);
    }
}
exports.sendMessage = sendMessage;

var ttsMessage = function(bot, channel, message) {
    // If the message is too big, let's split it...
    if (message.length > MESSAGE_LIMIT) {
        return sendMessages(bot, channel, message.split(/\r?\n/), true);
    } else {
        return _sendMessage(bot, channel, message, true);
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
    return sendMessage(bot, pmOrSendChannel(command, pmIfSpam, user, channel), message);
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

    return async.forEachSeries(compiledArray, function(output, cb) {
        if (output) {
            _sendMessage(bot, channel, output, tts).then(function() {
                cb();
            });
        } else {
            cb();
        }
    });
}
exports.sendMessages = sendMessages;

// Send the message to the channel, or via PM if both command.spammy and pmIfSpam are true
var pmOrSendArray = function(bot, command, pmIfSpam, user, channel, messages) {
    return sendMessages(bot, pmOrSendChannel(command, pmIfSpam, user, channel), messages, false)
        .then(function(response) {}, function(error) {
            logError("Error sending message: " + error);
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
        var prefix = "";
        if (config.COMMAND_PREFIX) {
            prefix = config.COMMAND_PREFIX;
        }
        return sendMessage(bot, channel, "Usage: " + prefix + command.usage);
    } else {
        resolve();
    }
}

var logError = function(header, error, callback, debug) {
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

    fs.writeFile("./errors.json",JSON.stringify(errors,null,2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });
    debug(now);
    debug(header);
    debug(error);
    if (callback) {
        callback(err);
    }
}
exports.logError = logError;

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