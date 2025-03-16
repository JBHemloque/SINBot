'use strict';

const path = require('path');
const base = require(path.resolve(__dirname, '../../base.js'));
const regions = require(path.resolve(base.path, 'regions.json'));

// var data = require('../data.js');

const prefix = "regions";

function getRegionByKey(key, cb) {
	console.log("Looking for region " + key);
    // data.read(prefix, key, cb);
    let region = regions[key];
    console.log('Found ' + JSON.stringify(region));
    cb(region);
}
module.exports.getRegionByKey = getRegionByKey;

function writeRegionToRedis(region) {
	// if (region.region) {
	// 	data.write(prefix, region.region, region);
	// }
}
module.exports.writeRegionToRedis = writeRegionToRedis;