var Discord = require("discord.js");

function makeCache(initialValues) {
	var cache = new Discord.Cache();
	for (var i = 0; i < initialValues.length; i++) {
		cache.add(initialValues[i]);
	}
	return cache;
}

function makeServer(memlist) {
	return {
		members: makeCache(memlist)
	};
}

function makeTextChannel(name) {
	return {
		name: name,
		topic: "Test TextChannel",
		isPrivate: false,
		lastMessage: null,
		messages: [],
		toString: function() {
			return this.name;
		},
		server: makeServer([adminUser, nonAdminUser])
	};
}

function makePMChannel(name, rec) {
	return {
		name: name,
		topic: "Test PMChannel",
		recipient: rec,
		isPrivate: true,
		lastMessage: null,
		messages: [],
		toString: function() {
			return this.name;
		},
		server: makeServer([adminUser, nonAdminUser])
	}; 
}

function makeUser(userName, userId) {
	return {
		id: userId,
		name: userName,
		username: userName,
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
		server: "A Server",
		channel: channel,
		author: user,
		content: message,
		isMentioned: function(user) {
			return message.includes(user.name);
		},
		toString: function() {
			return this.content;
		}
	};
}

function makeMessage(message, user) {
	return _makeMessage(message, user, makeTextChannel("Text"));
}

function makePrivateMessage(message, user, recipient) {
	if (!recipient) {
		recipient = user;
	}
	return _makeMessage(message, user, makePMChannel("PM", recipient));
}

function makeClient(sendMessageCallback, plugins, setChannelTopicCallback) {
	return {
		user: makeUser("Client user", 666),
		sendMessage: sendMessageCallback,
		setChannelTopic: setChannelTopicCallback,
		servers: "Server\nList",
		channels: "Channel\nList"
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

exports.makeMessage = makeMessage;
exports.makePrivateMessage = makePrivateMessage;
exports.makeClient = makeClient;
exports.makeConfig = makeConfig;
exports.makeDirectConfig = makeDirectConfig;
exports.nonAdminId = nonAdminId;
exports.adminId = adminId;
exports.nonAdminUser = nonAdminUser;
exports.adminUser = adminUser;