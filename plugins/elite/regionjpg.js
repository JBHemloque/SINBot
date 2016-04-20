'use strict';

var fs = require("fs");
var gm = require('gm');
var imageMagick = gm.subClass({ imageMagick: true });

var regions = require("./regions.json");

// Magic numbers based on the source image, Galaxy.jpg
const KLY_TO_PIXEL = 1000 / 12.5;
const X0 = 500;
const Y0 = 875;

var regionFont = "Wingdings";

var generateRegionMap = function(key, callback) {
	var x = regions[key].coords.x;
	// coords.z is actually the y axis on our maps. Blame EDSM...
	var y = regions[key].coords.z;
	x /= KLY_TO_PIXEL;
	y /= KLY_TO_PIXEL;
	x += X0;
	y = Y0 - y;
	x = Math.floor(x);
	y = Math.floor(y);

	// convert Galaxy.jpg -fill white -stroke black -draw "circle Circle.x,Circle.y Circle.x+5,Circle.y+5" 
	// -fill white -stroke black -font ArialBk -pointsize 20 -draw "text Circle.x+20,Circle.y+7 'Hello'" maps/REGION.jpg
	imageMagick("./plugins/elite/Galaxy.jpg").fill("#ffffffff").stroke("#000000ff").drawCircle(x,y,x+5,y+5)
				.font(regionFont).fontSize(20).drawText(x+20,y+7,regions[key].region)
				.write("./plugins/elite/maps/" + key + ".jpg", function(err) {
		if (err) {
			console.log("Error doing conversion: ");
			console.log(err);
			console.log(regions[key]);	
			throw err;
		}		
		regions[key].map = key + ".jpg";
		callback();
	});	
}

var fetchRegionMap = function(region, callback) {
	var key = region.toLowerCase();
	if (regions[key].map) {
		callback();
	} else {
		generateRegionMap(key, function() {
			fs.writeFile("./regions.json",JSON.stringify(regions,null,2), null);
			callback();
		});
	}		
}

var setRegionFont = function(font) {
	regionFont = font;
}

exports.setRegionFont = setRegionFont;
exports.generateRegionMap = generateRegionMap;
exports.fetchRegionMap = fetchRegionMap;