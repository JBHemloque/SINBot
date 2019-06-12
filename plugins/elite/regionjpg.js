'use strict';

var fs = require("fs");
var gm = require('gm');
var imageMagick = gm.subClass({ imageMagick: true });
var regions = require('./regions.js');
var elitelib = require('./elitelib.js');

// Magic numbers based on the source image, Galaxy.jpg
const KLY_TO_PIXEL = 1000 / 12.5;
const X0 = 500;
const Y0 = 875;

var _regionFont = "ArialBk";
var _sourceFile = "./plugins/elite/Galaxy.jpg";
var _destDir = "./plugins/elite/maps/";

if (!fs.existsSync(_sourceFile)) {
    console.log("\n\nSOMETHING IS WRONG\nCould not find " + _sourceFile + "\nCheck your installation for corruption");
}

var normalizeCoordX = function(x) {
    x /= KLY_TO_PIXEL;
    x += X0;
    x = Math.floor(x);
    return x;
}

var normalizeCoordY = function(y) {  
    y /= KLY_TO_PIXEL;
    y = Y0 - y;
    y = Math.floor(y);
    return y;
}

var generateCoordFileName = function(x, y) {
    return "COORD_" + x.toString() + "_" + y.toString();
}

var generateRegionMap = function(key, callback) {
    regions.getRegionByKey(key, function(region) {
        if (region && region.coords) {
            var x = normalizeCoordX(region.coords.x);
            // coords.z is actually the y axis on our maps. Blame EDSM...
            var y = normalizeCoordY(region.coords.z);

            generateRegionMapByCoords(x, y, region.region, region.region.toLowerCase(), callback);
            return true;
        }        
    });
    return false;
}

var generateRegionMapByCoords = function(x, y, name, filename, callback) {
    if (!filename) {
        filename = generateCoordFileName(x, y);
    }
    if (!name) {
        name = "";
    }

    if (!fs.existsSync(_sourceFile)) {
        console.log("\n\nSOMETHING IS WRONG\nCould not find " + _sourceFile + "\nCheck your installation for corruption");
    }

    // convert Galaxy.jpg -fill white -stroke black -draw "circle Circle.x,Circle.y Circle.x+5,Circle.y+5" 
    // -fill white -stroke black -font ArialBk -pointsize 20 -draw "text Circle.x+20,Circle.y+7 'Hello'" maps/REGION.jpg
    imageMagick(_sourceFile).fill("#ffffffff").stroke("#000000ff").drawCircle(x,y,x+5,y+5)
                .font(_regionFont).fontSize(20).drawText(x+20,y+7,name)
                .write(_destDir + filename + ".jpg", function(err) {
        if (err) {
            console.log("Error doing conversion: ");
            console.log(err);
            console.log(region);    
            throw err;
        }
        var region = {
            map: filename + ".jpg",
            region: filename
        }
        regions.writeRegionToRedis(region);
        console.log("Generated " + region.map);
        callback(region);
    });
}

var fetchRegionMapByCoords = function(x, y, location, callback) {
    console.log("fetchRegionMapByCoords(" + x + ", " + y + ", " + location + ", callback)");
    x = normalizeCoordX(x);
    y = normalizeCoordY(y);
    var filename = generateCoordFileName(x, y);
    var name = undefined;    // This is only set for regions
    if (elitelib.isProcGen(location)) {
        name = elitelib.getRegionName(location);
        filename = name.toLowerCase();
    }
    regions.getRegionByKey(filename, function(rgn) {
        if (rgn && rgn.map && (fs.existsSync(_destDir + rgn.map))) {
            callback(rgn);
        } else {
            generateRegionMapByCoords(x, y, name, filename, callback);
        }
    });
}

var fetchRegionMap = function(region, callback) {
    var key = region.toLowerCase();
    regions.getRegionByKey(key, function(rgn) {
        if (rgn && rgn.map && (fs.existsSync(_destDir + rgn.map))) {
            callback(rgn);
        } else {
            generateRegionMap(key, callback);
        }
    });
}

var fetchRegionMapByKey = function(key, callback) {
    
}

var setRegionFont = function(font) {
    _regionFont = font;
}

exports.setSourceFile = function(sourceFile) {
    _sourceFile = sourceFile;
}

exports.setDestDir = function(destDir) {
    _destDir = destDir;
}

exports.setRegionFont = setRegionFont;
exports.fetchRegionMap = fetchRegionMap;
exports.fetchRegionMapByCoords = fetchRegionMapByCoords;