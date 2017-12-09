'use strict';

var base = require('../base.js');
var path = require('path');

var messagebox;

try{
    console.log('  - Loading ' + path.resolve(base.path, "messagebox.json"));
    messagebox = require(path.resolve(base.path, "messagebox.json"));
} catch(e) {
    //no stored messages
    messagebox = {};
}

function updateMessagebox(){
    fs.writeFile(path.resolve(base.path, "messagebox.json"),JSON.stringify(messagebox,null,2), null);
}

function clearMessageBox() {
	messagebox = {};
    updateMessagebox();
}
module.exports.clearMessageBox = clearMessageBox;

function checkForMessages(bot, user) {
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
            utils.sendMessages(bot, user, outputArray);
            delete messagebox[user.id];
            updateMessagebox();
        }
    }catch(e){
        utils.logError("Error reading messagebox", e);
        throw e;
    }
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