'use strict';

var base = require('../base.js');
var path = require('path');
var regions = require('./regions');

function regionsToRedis(regionfile) {	
	try{
	    console.log("Attempting to load regionfile " + regionfile);
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
	} catch(e) {
	    console.log("Could not load regions...");
	}
}
module.exports.regionsToRedis = regionsToRedis;

regionsToRedis(path.resolve(base.path, "plugins/elite/alias.json"));