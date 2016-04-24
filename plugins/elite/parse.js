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
	var date = new Date(rawsys[i].date);
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

console.log("Done!");