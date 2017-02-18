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
        guild: makeServer(userList)
    };
}

function makePMChannel(name, rec, sendMessage) {
    return {
        name: name,
        topic: "Test PMChannel",
        recipient: rec,
        isPrivate: true,
        lastMessage: null,
        messages: [],
        sendMessage: sendMessage,
        toString: function() {
            return this.name;
        },
        guild: makeServer([adminUser, nonAdminUser])
    }; 
}

function makeUser(userName, userId) {
    return {
        id: userId,
        name: userName,
        username: userName,
        sendMessage: function(message) {
        },
        user: {username: userName},
        'user.username': userName,
        toString: function() {
            return this.name;
        }
    };
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
    return _makeMessage(message, user, makeTextChannel("Text", sm, st));
}

function makePrivateMessage(message, user, recipient, sendMessage) {
    if (!recipient) {
        recipient = user;
    }
    return _makeMessage(message, user, makePMChannel("PM", recipient, sendMessage));
}

function makeClient(sendMessageCallback, plugins, setChannelTopicCallback) {
    return {
        user: makeUser("Client user", 666),
        sendMessage: sendMessageCallback,
        setChannelTopic: setChannelTopicCallback,
        guilds: {array: function() {return [{id: "Server ID", name:"Server Name"}]}},
        channels: ["Channel\nList"],
        fetchUser: function(id) {
            // Return a promise
            for (i = 0; i < userList.length; i++) {
                if (userList[i].id.toString() === id) {
                    return new Promise(function(resolve, reject) {
                        resolve(userList[i]);
                    });
                }
            }
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
        ADMIN_IDS: [adminId]
    };
}

var nonAdminId = 987987987;
var adminId = 42;

var nonAdminUser = makeUser("Non-admin user", nonAdminId);
var adminUser = makeUser("Admin user", adminId);

var userList = [adminUser, nonAdminUser];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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