'use strict';

var densitySigmaArray = [ // in SI units of kg/m^3
        {likelyType: "IW", densities: [1.06e+3, 1.84e+3, 2.62e+3, 3.40e+3]},
        {likelyType: "RIW", densities: [2.25e+3, 2.82e+3, 3.38e+3, 3.95e+3]},
        {likelyType: "RW", densities: [2.94e+3, 3.77e+3, 4.60e+3, 5.43e+3]},
        {likelyType: "HMC", densities: [1.21e+3, 4.60e+3, 8.00e+3, 1.14e+4]},
        {likelyType: "MR", densities: [1.47e+3, 7.99e+3, 1.45e+4, 2.10e+4]},
        {likelyType: "WW", densities: [1.51e+3, 4.24e+3, 6.97e+3, 9.70e+3]},
        {likelyType: "ELW", densities: [4.87e+3, 5.65e+3, 6.43e+3, 7.21e+3]},
        {likelyType: "AW", densities: [4.23e+2, 3.50e+3, 6.59e+3, 9.67e+3]}
];

function handleGravity(planetMass, planetRadius) {
    var G = 6.67e-11;
    var earthMass = 5.98e24;
    var earthRadius = 6367444.7;
    var baseG = G * earthMass / (earthRadius * earthRadius);
    var planetG = G * planetMass * earthMass / (planetRadius * planetRadius * 1e6);
    var planetDensity = planetMass * earthMass / (4.0 / 3.0 * Math.PI * planetRadius * planetRadius * planetRadius) * 1e-9; // in SI units of kg/m^3
    var planetM2Str = planetG.toFixed(2);
    var planetGStr = (planetG / baseG).toFixed(2);
    var planetDensityStr = planetDensity.toExponential(2);
    var maybeTypes = [];
    var likelyTypes = [];

    for (var i = 0; i < densitySigmaArray.length; i++) {
        var row = densitySigmaArray[i];
        if (planetDensity > row.densities[1] && planetDensity < row.densities[2]) {
            likelyTypes.push(row.likelyType);
        } else if (planetDensity > row.densities[0] && planetDensity < row.densities[3]) {
            maybeTypes.push(row.likelyType);
        }
    }
    var densityString = "";
    if (likelyTypes.length > 0) {
        densityString += "\n**Likely**: " + likelyTypes.sort().join(", ");
    }
    if (maybeTypes.length > 0) {
        densityString += "\n**Possible**: " + maybeTypes.sort().join(", ");
    }

    var ret = "The gravity for a planet with " + planetMass + " Earth masses and a radius of ";
    ret += planetRadius + " km is **" + planetM2Str + "** m/s^2 or **" + planetGStr;
    ret += "** g. It has a density of **" + planetDensityStr + "** kg/m^3." + densityString;
    return ret;
}

/**
Implements Jackie Silver's method of stellar density calculation

To find the density, look at the navpanel. If there are more than 50 star systems within 20 light years, 
only the first 50 systems will be shown. Otherwise, the navpanel will show all systems within 20 light years.

This gives us two ways of finding the density:

1) For dense areas where there are more than 50 star systems, look at the last star system in the list, 
and see what its distance ("r") from your ship is. This lets us estimate the density as rho = 50 / ((4pi/3) * (r^3))

2) For sparse areas where there are less than 50 star systems, count how many star systems ("n") are visible in 
total in the navpanel. This lets us estimate the density as rho = n / ((4pi/3) * (20^3))

This function prioritizes 1) over 2) - so it will perform method 1 if r is not undefined, otherwise 2
**/
function calcRho(r, n) {
    if (r) {
        return 50 / ((4 * Math.PI / 3) * Math.pow(r, 3));
    } else if (n) {
        return n / ((4 * Math.PI / 3) * Math.pow(20, 3));
    }
    return undefined;
}

function normalizeName(location) {
    return location.replace('%20', ' ');
}

function isProcGen(location) {
    location = normalizeName(location);
    var names = location.split(/ [a-z][a-z]-[a-z] /i);
    if (names.length > 1) {
        return true;
    }
    return false;
}

function getRegionName(location) {
    location = normalizeName(location);
    var names = location.split(/ [a-z][a-z]-[a-z] /i);
    return names[0].toLowerCase();
}

exports.handleGravity = handleGravity;
exports.calcRho = calcRho;
exports.isProcGen = isProcGen;
exports.getRegionName = getRegionName;