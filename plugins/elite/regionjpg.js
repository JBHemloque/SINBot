'use strict';

var fs = require("fs");
var gm = require('gm');
var imageMagick = gm.subClass({ imageMagick: true });
var regions = require('./regions.js');

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

var generateRegionMap = function(key, callback) {
    regions.getRegionByKey(key, function(region) {
        if (region) {
            var x = region.coords.x;
            // coords.z is actually the y axis on our maps. Blame EDSM...
            var y = region.coords.z;
            x /= KLY_TO_PIXEL;
            y /= KLY_TO_PIXEL;
            x += X0;
            y = Y0 - y;
            x = Math.floor(x);
            y = Math.floor(y);

            if (!fs.existsSync(_sourceFile)) {
                console.log("\n\nSOMETHING IS WRONG\nCould not find " + _sourceFile + "\nCheck your installation for corruption");
            }

            // convert Galaxy.jpg -fill white -stroke black -draw "circle Circle.x,Circle.y Circle.x+5,Circle.y+5" 
            // -fill white -stroke black -font ArialBk -pointsize 20 -draw "text Circle.x+20,Circle.y+7 'Hello'" maps/REGION.jpg
            imageMagick(_sourceFile).fill("#ffffffff").stroke("#000000ff").drawCircle(x,y,x+5,y+5)
                        .font(_regionFont).fontSize(20).drawText(x+20,y+7,region.region)
                        .write(_destDir + key + ".jpg", function(err) {
                if (err) {
                    console.log("Error doing conversion: ");
                    console.log(err);
                    console.log(region);    
                    throw err;
                }        
                region.map = key + ".jpg";
                regions.writeRegionToRedis(region);
                console.log("Generated " + region.map);
                callback(region);
            }); 
        }        
    });
}

var fetchRegionMap = function(region, callback) {
    var key = region.toLowerCase();
    regions.getRegionByKey(key, function(rgn) {
        if (rgn.map && (fs.existsSync(_destDir + rgn.map))) {
            callback(rgn);
        } else {
            generateRegionMap(key, callback);
        }  
    });
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