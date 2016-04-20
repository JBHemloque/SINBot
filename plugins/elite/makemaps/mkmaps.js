var fs = require("fs");
var regionjpg = require("regionjpg.js");

var compiled = require("../regions.json");

console.log("Loaded " + compiled.length + " regions...");

console.log("Converting images");

var images = 0;
for (key in compiled) {
	if (!compiled[key].map) {
	// if (key == "Ceeckia") {
		regionjpg.generateRegionMap(key, function() {
			images++;
		});		
		if (images === 250) {
			// We'll just do batches of 250...
			break;
		}
	}
}

fs.writeFile("../regions.json",JSON.stringify(compiled,null,2), null);

console.log("Created " + images + " maps. Done!");