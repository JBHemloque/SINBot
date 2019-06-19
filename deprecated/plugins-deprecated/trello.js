'use strict';

var Bot = null;

exports.findCommand = function(command) {
    return null;
}

exports.setup = function(config, bot, botcfg) {
    Bot = require('./trellobot.js')
    ,bot = new Bot({
        pollFrequency: 1000*60*1 //every minute
        ,start: true
        ,trello: {
            boards: config.boards
            ,key: config.key
            ,token: config.token
            ,events: ['createCard','commentCard','addAttachmentToCard','updateCard','updateCheckItemStateOnCard']
        }
        ,discord: bot
    });
}