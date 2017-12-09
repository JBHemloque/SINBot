'use strict';

var data = require('../../server/data.js');

const prefix = "regions";

function getRegionByKey(key, cb) {
	console.log("Looking for region " + key);
    data.read(prefix, key.toLowerCase(), cb);
}
module.exports.getRegionByKey = getRegionByKey;

function writeRegionToRedis(region) {
	if (region.region) {
		data.write(prefix, region.region.toLowerCase(), region);
	}
}
module.exports.writeRegionToRedis = writeRegionToRedis;