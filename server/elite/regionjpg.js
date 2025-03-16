'use strict';

var fs = require("fs");
var path = require('path');
var base = require(path.resolve(__dirname, '../../base.js'));
// Lazy load the regions library because it tries to connect to redis and that messes up unit tests
var regions;
var elitelib = require(path.resolve(base.path, 'server/elite/elitelib.js'));
const { AttachmentBuilder, Client, Events, GatewayIntentBits } = require('discord.js');
const Canvas = require('@napi-rs/canvas');

// Magic numbers based on the source image, Galaxy.jpg
const KLY_TO_PIXEL = 1000 / 12.5;
const X0 = 500;
const Y0 = 875;

var _regionFont = "ArialBk";
var _sourceFile = path.resolve(base.path, 'server/elite/Galaxy.jpg');
var _destDir = "./maps/";

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

var regionsLib = function() {
    if (!regions) {
        regions = require(path.resolve(base.path, 'server/elite/regions.js'));
    }
    return regions;
}

var generateRegionMap = function(key, callback) {
    // console.log(`generateRegionMap(${key}, callback)`);
    regionsLib().getRegionByKey(key, function(region) {
        // console.log('Got region: ' + JSON.stringify(region));
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

async function generateRegionMapByCoords(x, y, name, filename, callback) {
    console.log(`generateRegionMapByCoords(${x}, ${y}, ${name}, ${filename}, callback)`);
    if (!filename) {
        filename = generateCoordFileName(x, y);
    }
    if (!name) {
        name = "";
    }

    if (!fs.existsSync(_sourceFile)) {
        console.log("\n\nSOMETHING IS WRONG\nCould not find " + _sourceFile + "\nCheck your installation for corruption");
    }

    const background = await Canvas.loadImage(_sourceFile);
    const canvas = Canvas.createCanvas(background.width, background.height);
    const context = canvas.getContext('2d');
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
    // context.strokeRect(0, 0, background.width, background.height);
    // Select the font size and type from one of the natively available fonts
    context.font = '20px sans-serif';
    // Select the style that will be used to fill the text in
    context.fillStyle = '#ffffff';
    // Actually fill the text with a solid color
    context.fillText(name, x+20, y+7);
    // Circle
    context.beginPath();
    context.arc(x, y, 5, 0, 2 * Math.PI);
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = "#ffffff";
    context.stroke();
    // And make attachment
    let mapname = filename + ".jpg";
    const attachment = new AttachmentBuilder(await canvas.encode('jpeg'), { name: mapname });

    var region = {
        map: mapname,
        region: filename,
        attachment: attachment
    }
    // regionsLib().writeRegionToRedis(region);
    console.log("Generated " + region.map);
    callback(region);
}

var fetchRegionMapByCoords = function(x, y, location, callback) {
    // console.log("fetchRegionMapByCoords(" + x + ", " + y + ", " + location + ", callback)");
    x = normalizeCoordX(x);
    y = normalizeCoordY(y);
    var filename = generateCoordFileName(x, y);
    var name = undefined;    // This is only set for regions
    if (elitelib.isProcGen(location)) {
        name = elitelib.getRegionName(location);
        filename = name.toLowerCase();
    } else {
        // We'll set the system name here, for friendliness
        name = location;
    }
    regionsLib().getRegionByKey(filename, function(rgn) {
        if (rgn && rgn.map && (fs.existsSync(_destDir + rgn.map))) {
            callback(rgn);
        } else {
            generateRegionMapByCoords(x, y, name, filename, callback);
        }
    });
}

var fetchRegionMap = function(region, callback) {
    var key = region.toLowerCase();
    regionsLib().getRegionByKey(key, function(rgn) {
        var generateMap = true;
        if (rgn && rgn.map && (fs.existsSync(_destDir + rgn.map))) {
            callback(rgn);
            return true;
        } 
        if (generateMap) {
            return generateRegionMap(key, callback);
        }
    });
    return false;
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