'use strict';

const redis = require('redis');

const client = redis.createClient();

client.on("error", function(err) {
	console.log("Redis data error " + err);
});

client.connect();

function generateKey(prefix, id) {
	return prefix + "__" + id.replace(/ /g,"_").toLowerCase();
}

async function write(prefix, id, data) {
	client.set(generateKey(prefix, id), JSON.stringify(data));
}
module.exports.write = write;

async function writeString(prefix, id, data) {
	client.set(generateKey(prefix, id, data));
}
module.exports.writeString = writeString;

async function read(prefix, id, cb) {
	console.log('await client.connect()');
	console.log('get ' + generateKey(prefix, id));
	let reply = await client.get(generateKey(prefix, id));
	if (reply) {
		console.log("Got data: " + reply);
		var data = JSON.parse(reply);
		cb(data);
	} else {
		console.log('Got no data');
		cb(undefined);
	}
}
module.exports.read = read;

async function readString(prefix, id, cb) {
	let reply = await client.get(generateKey(prefix, id));
	cb(reply);
}
module.exports.readString = readString;