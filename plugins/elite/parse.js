var fs = require("fs");
var request = require("request");
var JSONStream = require("JSONStream");
var es = require("event-stream");

const SOURCE_URL = "http://www.edsm.net/dump/systemsWithCoordinates.json";

// console.log("Loading raw data...");
// var rawsys = require("./systemsWithCoordinates.json");
var parsed = {};
var compiled = {};

var preproc = function(data) {
	// console.log(rawsys[i].name);
	var names = data.name.split(/ [a-z][a-z]-[a-z] /i);
	// console.log(names);
	if (names.length === 1) {
		nonStandardCount++;
	}
	var key = names[0];
	// procedural regions have the form of "blah blah AA-A blah", where " AA-A " represents a letter pattern
	var coords = data.coords;
	var item = parsed[key];
	var date = new Date(data.date);
	if (item) {
		item.items.push(coords);
		// Save the oldest date for this region
		if (item.date > date) {
			item.date = date;
		}
	} else {
		item = {items: [coords], date: date};
	}
	parsed[key] = item;
}

function postproc() {
	// Work out an average coordinate for each region
	console.log("Calculating regional coordinates...");
	var regions = 0;
	for (key in parsed) {
		var item = parsed[key];
		var cx = 0;
		var cy = 0;
		var cz = 0;
		for (var i = 0; i < item.items.length; i++) {
			cx += item.items[i].x;
			cy += item.items[i].y;
			cz += item.items[i].z;
		}
		cx /= item.items.length;
		cy /= item.items.length;
		cz /= item.items.length;
		compiled[key.toLowerCase()] = {region: key, coords: {x: cx, y: cy, z: cz}, points: item.items.length, date: item.date};
		regions++;
	}

	console.log("Writing " + (regions-nonStandardCount).toString() + " regions and " + nonStandardCount + " non-standard regions...");

	fs.writeFile("./regions.json",JSON.stringify(compiled,null,2), null);
}

var nonStandardCount = 0;

console.log("Streaming data...");

var stream = request({url: SOURCE_URL})
	.pipe(JSONStream.parse("*"))
	.pipe(es.mapSync(function(data) {
		// process.stdout.write(".");
		preproc(data);	
	}));

stream.on("end", function() {
	console.log("Postprocessing...");

	postproc();

	console.log("Done!");
});
