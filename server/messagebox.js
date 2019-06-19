'use strict';

var base = require('../base.js');
var path = require('path');
var fs = require("fs");
var utils = require('./utils.js');

var messagebox;

try{
    utils.debugLog('  - Loading ' + path.resolve(base.path, "messagebox.json"));
    messagebox = require(path.resolve(base.path, "messagebox.json"));
} catch(e) {
    //no stored messages
    messagebox = {};
}

function updateMessagebox(){
    fs.writeFile(path.resolve(base.path, "messagebox.json"),JSON.stringify(messagebox,null,2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });
}

function clearMessageBox() {
	messagebox = {};
    updateMessagebox();
}
module.exports.clearMessageBox = clearMessageBox;

function checkForMessages(bot, user) {
    return new Promise(function(resolve, reject) {
        try{
            if(messagebox.hasOwnProperty(user.id)){
                var message = messagebox[user.id];
                var outputArray = [];
                if (message.content) {
                    outputArray.push(message.content);
                } else {
                    for (var i = 0; i < message.length; i++) {
                        outputArray.push(message[i].content);
                    }
                }
                delete messagebox[user.id];
                updateMessagebox();
                utils.sendMessages(bot, user, outputArray)
                .then(function() {
                    resolve();
                });
            } else {
                resolve();
            }
        } catch(e){
            utils.logError("Error reading messagebox", e);
            // We won't crash the bot for this...
            resolve();
        }
    });
}
module.exports.checkForMessages = checkForMessages;

function addMessage(targetId, message) {
    var msg = messagebox[targetId];
    if (msg) {
        // Ensure it's a new-style message
        if (msg.content) {
            // Old style message... Turn it into an array
            var msgArray = [];
            msgArray.push(msg);
            msg = msgArray;
        }
    } else {
        msg = [];
    }
    msg.push(message);
    messagebox[targetId] = msg;
    updateMessagebox();
}
module.exports.addMessage = addMessage;