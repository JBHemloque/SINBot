'use strict';

var data = require('../../server/data.js');

const prefix = "regions";

function getRegionByKey(key, cb) {
    data.read(prefix, key, cb);
}
module.exports.getRegionByKey = getRegionByKey;

function writeRegionToRedis(region) {
	if (region.region) {
		data.write(prefix, region.region, region);
	}
}
module.exports.writeRegionToRedis = writeRegionToRedis;