'use strict';

var regions = require('./regions');

function regionsToRedis(regionfile) {
	var json = require(regionfile);

	var count = 0;
	var thousands = 0;

	if (json) {
		console.log('writing...');
		for (var key in json) {
			var rgn = json[key];
			if (rgn) {
				count += 1;
				if (count >= 1000) {
					thousands += 1;
					console.log(thousands + ' thousand...');
					count = 0;
				}
				regions.writeRegionToRedis(rgn);
			}
		}
		console.log('Done! Wrote ' + thousands + ',' + count + ' regions.');
	} else {
		console.log("Could not load " + regionfile);
	}
}
module.exports.regionsToRedis = regionsToRedis;