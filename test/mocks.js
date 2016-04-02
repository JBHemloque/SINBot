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

function makeMessage(message, user) {
	if (!user) {
		user = nonAdminUser;
	}
	return {
		channel: makeTextChannel(),
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
	if (!plugins) {
		plugins = {};
	}
	return {
		NAME: "Test Bot",
		COMMAND_PREFIX: "!",
		PLUGINS: plugins,
		ADMIN_IDS: [adminId]
	};
}

var nonAdminId = 987987987;
var adminId = 42;

var nonAdminUser = makeUser("Non-admin user", nonAdminId);
var adminUser = makeUser("Admin user", adminId);

exports.makeMessage = makeMessage;
exports.makeClient = makeClient;
exports.makeConfig = makeConfig;
exports.nonAdminId = nonAdminId;
exports.adminId = adminId;
exports.nonAdminUser = nonAdminUser;
exports.adminUser = adminUser;