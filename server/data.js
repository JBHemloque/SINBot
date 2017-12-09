'use strict';

var redis = require("redis");
var client = redis.createClient();

client.on("error", function(err) {
	console.log("Redis data error " + err);
});

function generateKey(prefix, id) {
	return prefix + "__" + id;
}

function write(prefix, id, data) {
	client.set(generateKey(prefix, id), JSON.stringify(data));
}
module.exports.write = write;

function writeString(prefix, id, data) {
	client.set(generateKey(prefix, id, data));
}
module.exports.writeString = writeString;

function read(prefix, id, cb) {
	client.get(generateKey(prefix, id), function(err, reply) {
		if (reply) {
			console.log("Got data: " + reply);
			var data = JSON.parse(reply);
			cb(data);
		} else {
			cb(undefined);
		}
	});
}
module.exports.read = read;

function readString(prefix, id, cb) {
	client.get(generateKey(prefix, id), function(err, reply) {
		cb(reply);
	});
}
module.exports.readString = read;