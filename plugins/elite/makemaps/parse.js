var fs = require("fs");

console.log("Loading raw data...");
var rawsys = require("./systemsWithCoordinates.json");
var parsed = {};
var compiled = {};

var nonStandardCount = 0;
// Run through the systems and extract the region.
console.log("Extracting region data...");
for (var i = 0; i < rawsys.length; i++) {
	// console.log(rawsys[i].name);
	var names = rawsys[i].name.split(/ [a-z][a-z]-[a-z] /i);
	// console.log(names);
	if (names.length === 1) {
		nonStandardCount++;
	}
	var key = names[0];
	// procedural regions have the form of "blah blah AA-A blah", where " AA-A " represents a letter pattern
	var coords = rawsys[i].coords;
	var item = parsed[key];
	if (item) {
		item.push(coords);
	} else {
		item = [coords];
	}
	parsed[key] = item;
}

// Work out an average coordinate for each region
console.log("Calculating regional coordinates...");
var regions = 0;
for (key in parsed) {
	var item = parsed[key];
	var cx = 0;
	var cy = 0;
	var cz = 0;
	for (var i = 0; i < item.length; i++) {
		cx += item[i].x;
		cy += item[i].y;
		cz += item[i].z;
	}
	cx /= item.length;
	cy /= item.length;
	cz /= item.length;
	compiled[key.toLowerCase()] = {region: key, coords: {x: cx, y: cy, z: cz}, points: item.length};
	regions++;
}

console.log("Writing " + (regions-nonStandardCount).toString() + " regions and " + nonStandardCount + " non-standard regions...");

fs.writeFile("../regions.json",JSON.stringify(compiled,null,2), null);

console.log("Done!");