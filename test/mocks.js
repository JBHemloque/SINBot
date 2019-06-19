var Discord = require("discord.js");
var assert = require('assert');

function makeCollection(memlist) {
    // Fake it 'til you make it
    return {
        memlist: memlist,
        array: function() { return memlist; },
        findAll: function(field, value) {
            var res = [];
            for (var i = 0; i < this.memlist.length; i++) {
                if (this.memlist[i][field] === value) {
                    res.push(this.memlist[i]);
                }
            }
            return res;
        }
    };
}

function makeServer(memlist) {
    return {
        members: makeCollection(memlist)
    };
}

function arrFromDict(dict) {
    var arr = [];
    for (var key in dict) {
        arr.push(dict[key]);
    }
    return arr;
}

function makeTextChannel(name, sendMessage, setTopic) {
    return {
        name: name,
        topic: "Test TextChannel",
        isPrivate: false,
        lastMessage: null,
        messages: [],
        sendMessage: sendMessage,
        setTopic: setTopic,
        toString: function() {
            return this.name;
        },
        guild: makeServer(arrFromDict(userList))
    };
}

function makePMChannel(name, rec, sendMessage) {
    return {
        name: name,
        topic: "Test PMChannel",
        recipient: rec,
        isPrivate: true,
        type: "dm",
        lastMessage: null,
        messages: [],
        sendMessage: sendMessage,
        toString: function() {
            return this.name;
        },
        guild: makeServer(arrFromDict(userList))
    }; 
}

function _makeUser(userName, userId, sendMessage) {
    var user =  {
        id: userId,
        name: userName,
        username: userName,
        sendMessage: function(message, options) {
            if (sendMessage) {
                sendMessage(message, options);
            }
            return new Promise(function(resolve, reject) {
                resolve(message, options);
            });
        },
        user: {username: userName},
        'user.username': userName,
        toString: function() {
            return this.name;
        }
    };
    userList[user.id] = user;
    return user;
}

function makeUser(userName, sendMessage) {
    return _makeUser(userName, nextUserId++, sendMessage);
}

function _makeMessage(message, user, channel) {
    if (!user) {
        user = nonAdminUser;
    }
    return {
        guild: "A Server",
        channel: channel,
        author: user,
        content: message,
        isMentioned: function(user) {
            return this.content.includes(user.id.toString());
        },
        toString: function() {
            return this.content;
        }
    };
}

function makeMessage(message, user, sendMessage, setTopic) {
    var sm = sendMessage;
    var st = setTopic;
    if (typeof user === 'function') {
        st = sm;
        sm = user;
        user = undefined;
    }
    return _makeMessage(
        message, 
        user, 
        makeTextChannel(
            "Text", 
            function(message, options) {
                sm(message, options);
                return new Promise(function(resolve, reject) {                  
                    resolve(message, options);
                });
            },
            st)
        );
}

function makePrivateMessage(message, user, recipient, sendMessage) {
    if (!recipient) {
        recipient = user;
    }
    return _makeMessage(
        message, 
        user, 
        makePMChannel(
            "PM", 
            recipient, 
            function(message, options) {
                return new Promise(function(resolve, reject) {
                    sendMessage(message, options);
                    resolve(message, options);
                });
            })
        );
}

function makeClient(sendMessageCallback, plugins, setChannelTopicCallback) {
    return {
        user: makeUser("Client user", 666),
        sendMessage: sendMessageCallback,
        setChannelTopic: setChannelTopicCallback,
        guilds: {array: function() {return [{id: "Server ID", name:"Server Name"}]}},
        channels: ["Channel\nList"],
        fetchUser: function(id) {
            return new Promise(function(resolve, reject) {
                if (userList[id]) {
                    resolve(userList[id]);
                } else {
                    reject();
                }                
            });       
        }
    };
}

function makeConfig(plugins) {
    return _makeConfig("!", plugins);
}

function makeDirectConfig(plugins) {
    return _makeConfig(null, plugins);
}

function _makeConfig(prefix, plugins) {
    if (!plugins) {
        plugins = {};
    }
    return {
        NAME: "Test Bot",
        COMMAND_PREFIX: prefix,
        PLUGINS: plugins,
        CLEAR_MESSAGEBOX: true,
        // DEBUG: true,
        ADMIN_IDS: [adminId],
        // DEBUG: true
    };
}

var nonAdminId = 987987987;
var adminId = 42;
var nextUserId = nonAdminId + 1;

var userList = {};

var nonAdminUser = _makeUser("Non-admin user", nonAdminId);
var adminUser = _makeUser("Admin user", adminId);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.makeUser = makeUser;
exports.makeMessage = makeMessage;
exports.makePrivateMessage = makePrivateMessage;
exports.makeTextChannel = makeTextChannel;
exports.makeClient = makeClient;
exports.makeConfig = makeConfig;
exports.makeDirectConfig = makeDirectConfig;
exports.nonAdminId = nonAdminId;
exports.adminId = adminId;
exports.nonAdminUser = nonAdminUser;
exports.adminUser = adminUser;
exports.sleep = sleep;