var fs = require("fs");
var regionjpg = require("../regionjpg.js");
var async = require('async');

var compiled = require("../regions.json");

console.log("Loaded " + compiled.length + " regions...");

console.log("Converting images");

regionjpg.setSourceFile("../Galaxy.jpg");
regionjpg.setDestDir("../maps/");

var images = 0;
async.forEachSeries(compiled, function(data, callback) {
	if (!data.map) {
		var key = data.region.toLowerCase();
		regionjpg.generateRegionMap(key, function() {
			images++;
			callback();
		}, compiled);
	} else {
		callback();
	}
}, function(err) {
	if (err) {
		console.log("Error generating map:");
		console.log(err);
	}
	fs.writeFile("../regions.json",JSON.stringify(compiled,null,2), null);

	console.log("Created " + images + " maps. Done!");
});