var Client = require('node-rest-client').Client;
var utils = require('../utils.js');
 
var client = new Client();

var aliases = {};
try{
	// We're in the plugin directory, but this is written in the context of the server, one directory down...
	aliases = require("../sysalias.json");
} catch(e) {
	//No aliases defined
	aliases = {};
}

var cmdraliases = {};
try{
	// We're in the plugin directory, but this is written in the context of the server, one directory down...
	cmdraliases = require("../cmdralias.json");
} catch(e) {
	//No aliases defined
	cmdraliases = {};
}

var normalizeSystem = function(system) {
	var key = system.toLowerCase();
	if (aliases[key]) {
		if (aliases[key].system) {
			return aliases[key].system;
		}
	}
	return system;
}
exports.setNormalizeSystem = function(fcn) {
	normalizeSystem = fcn;
}

var normalizeCmdr = function(cmdr) {
	var key = cmdr.toLowerCase();
	if (cmdraliases[key]) {
		if (cmdraliases[key].cmdr) {
			return cmdraliases[key].cmdr;
		}		
	}
	return cmdr;
}

var _getSystem = function(commander, callback) {
	client.get("http://www.edsm.net/api-logs-v1/get-position?commanderName=" + normalizeCmdr(commander), function (data, response) {
		try {
			callback(data);
		} catch(e) {
			console.log('JSON parse exception', e);
			callback(null);
		}
	}).on('error', function (err) {
		callback(null);
		console.log('Something went wrong on the request', err.request.options);
	});
}

var _getPositionString = function(commander, data) {
	var output = "Some error occurred";
	if (data) {
		if (data.system) {
			output = commander + " was last seen in " + data.system;
			if (data.date) {
				output += " at " + data.date;
			}
		} else {
			switch (data.msgnum) {
				case 100:
					output = "I have no idea where " + commander + " is. Perhaps they aren't sharing their position?";
					break;
				case 203:
					output = "There is no known commander by the name " + commander;
					break;
				default:
					// Use the default error message
					break;
			}
		}
	}
	return output;
}

var getPositionString = function(commander, callback) {
	_getSystem(commander, function(data) {
		var system = undefined;
		if (data) {
			if (data.system) {
				system = data.system;
			}
		}
		callback(_getPositionString(commander, data), system);
	});
}
 
var getPosition = function(commander, bot, message) {
	getPositionString(commander, function(data) {
		bot.sendMessage(message.channel, data);
	});
}

var _getSystemCoords = function(system, callback) {
	var url = "http://www.edsm.net/api-v1/system?systemName=" + normalizeSystem(system) + "&coords=1";
	console.log(url);
	client.get(url, function (data, response) {		
		if (data) {
			if (!data.name) {
				data = null;
			}
			callback(data);
		}
	}).on('error', function (err) {
		console.log("Error: " + JSON.stringify(err));
		callback(null);
	});
}

var _getCommanderCoords = function(commander, callback) {
	_getSystem(commander, function(data) {
		var output = _getPositionString(commander, data);
		if (data) {
			if (data.system) {
				_getSystemCoords(data.system, function(coords) {
					if (coords) {
						callback(coords);
					} else {
						callback(null);
					}
				});
			} else {
				callback(null);
			}
		} else {
			callback(null);
		}
	});
}

var _getSystemOrCmdrCoords = function(query, callback) {
	console.log("getSystemOrCmdrCoords(" + query + ")");
	_getSystemCoords(query, function(coords) {
		if (coords) {
			console.log(query + " is a system");
			callback(coords, false);
		} else {
			_getCommanderCoords(query, function(coords) {
				if (coords) {
					console.log(query + " is a commander");
				} else {
					console.log("Could not find " + query);
				}
				callback(coords, true);
			});
		}
	});
}
exports.getSystemOrCmdrCoords = _getSystemOrCmdrCoords;

var _getCoordString = function(coords) {
	return "[ " + coords.coords.x + " : " + coords.coords.y + " : " + coords.coords.z + " ]";
}

var getSystemCoords = function(system, bot, message) {
	_getSystemCoords(system, function(coords) {
		var output = "Sorry, " + system + " is not in EDSM";
		if (coords) {
			if (coords.coords) {
				output = "System: " + coords.name + " " + _getCoordString(coords);
			} else {
				output = "Sorry, " + system + " doesn't have coordinates in EDSM";
			}
		}
		bot.sendMessage(message.channel, output);
	});
}

var _sq2 = function(a, b) {
	var val = a - b;
	return val * val;
}

function _calculateStep(originCoords, destinationCoords, range) {
	const UNSCOOPABLE_TOP = 30;
	const UNSCOOPABLE_BOTTOM = -120;
	// console.log("_calculateStep(" + JSON.stringify(originCoords) + ", " + JSON.stringify(destinationCoords) + ", " + range + ")");
	var distance = _calcDistance(originCoords, destinationCoords);

	if (distance <= range) {
		return destinationCoords;
	}

	var rateX = (originCoords.x - destinationCoords.x)/distance;
	var rateY = (originCoords.y - destinationCoords.y)/distance;
	var rateZ = (originCoords.z - destinationCoords.z)/distance;

	var prospectiveY = originCoords.y - (rateY * range);
	// Avoid the unscoopable layer
	if ((UNSCOOPABLE_TOP > prospectiveY) && (UNSCOOPABLE_BOTTOM < prospectiveY)) {
		// we'll avoid it by setting our  y to UNSCOOPABLE_TOP. We'll have to reduce our range for this leg...
		// There are mathematically better ways of doing this, but this at least guarantees that we won't
		// plot a leg too long...
		range -= (UNSCOOPABLE_TOP - prospectiveY);
		prospectiveY = UNSCOOPABLE_TOP;
	}

	var coords = {
		x: originCoords.x - (rateX * range),
		y: prospectiveY,
		z: originCoords.z - (rateZ * range)
	};

	return coords;
}

var _calcDistance = function(a, b) {
	return Math.sqrt(_sq2(a.x, b.x) + _sq2(a.y, b.y) + _sq2(a.z, b.z));
}

var getCmdrCoords = function(commander, bot, message) {
	_getSystem(commander, function(data) {
		var output = _getPositionString(commander, data);
		if (data) {
			if (data.system) {
				_getSystemCoords(data.system, function(coords) {
					if (coords) {
						if (coords.coords) {
							output += " " + _getCoordString(coords);
						}
					}
					bot.sendMessage(message.channel, output);
				});
			}
		} else {
			bot.sendMessage(message.channel, output);
		}
	});
}

function getNoCoordString(item, isCmdr) {
	if (isCmdr) {
		return item + " has shared their location, but we have no coordinates for it.";
	} else {
		return "We have no coordinates for " + item + "."
	}
}

var getDistance = function(first, second, bot, message) {
	// Each query item could be a system or a commander...
	_getSystemOrCmdrCoords(first, function(firstCoords, firstIsCmdr) {
		if (firstCoords) {
			_getSystemOrCmdrCoords(second, function(secondCoords, secondIsCmdr) {
				if (secondCoords) {
					if (firstCoords.coords && secondCoords.coords) {
						var dist = _calcDistance(firstCoords.coords, secondCoords.coords);
						bot.sendMessage(message.channel, "Distance between " + first + " and " + second + " is " + dist.toFixed(2) + " ly");
					} else {
						var output = "Sorry, could not calculate the distance from " + first + " to " + second + ".";
						if (firstCoords.coords == undefined) {
							output += "\n" + getNoCoordString(first, firstIsCmdr);
						}
						if (secondCoords.coords == undefined) {
							output += "\n" + getNoCoordString(second, secondIsCmdr);
						}
						bot.sendMessage(message.channel, output);
					}
				} else {
					bot.sendMessage(message.channel, "Sorry, " + second + " could not be located");
				}
			});
		} else {
			bot.sendMessage(message.channel, "Sorry, " + first + " could not be located");
		}
	});
}

function _getNearbySystems(system, range, callback) {
	function responseHandler(data, response) {
		if (data) {
			if (data.length == 0) {
				data = null;
			}

			callback(data);
		} else {
			callback(null);
		}
	}

	function errorHandler(err) {
		callback(null);
	}

	var rangeParameter = "";

	if (range != null) {
		rangeParameter = "&radius=" + range;
	}

	client.get("http://www.edsm.net/api-v1/sphere-systems?systemName=" + system + "&coords=1" + rangeParameter, responseHandler).on("error", errorHandler);
}

function _getNearbySystemsByCoordinates(coords, range, callback) {
	function responseHandler(data, response) {
		if (data) {
			callback(data);
		} else {
			callback(null);
		}
	}

	function errorHandler(err) {
		callback(null);
	}

	var rangeParameter = "";

	if (range != null) {
		rangeParameter = "&radius=" + range;
	}

	client.get("http://www.edsm.net/api-v1/sphere-systems?x=" + Number(coords.x).toFixed(2) + "&y=" + Number(coords.y).toFixed(2) + "&z=" + Number(coords.z).toFixed(2) + "&coords=1" + rangeParameter, responseHandler).on("error", errorHandler);
}

function _getSystemCoordinates(system, callback) {
	function responseHandler(data, response) {
		if (data) {
			if (!data.name) {
				data = null;
			}

			callback(data);
		} else {
			callback(null);
		}
	}

	function errorHandler(err) {
		callback(null);
	}

	client.get("http://www.edsm.net/api-v1/system?systemName=" + system + "&coords=1", responseHandler).on("error", errorHandler);
}

function getNearbySystems(name, range, bot, channel) {
	function coordinatesResponseHandler(coords) {
		if (coords) {
			utils.sendMessage(bot, message.channel, "This may take a while....");
			systemName = coords.name;
			systemCoords = coords.coords;
			_getNearbySystems(systemName, range, nearbySystemsResponseHandler);
		} else {
			utils.sendMessage(bot, channel, name + " not found.");
		}
	}

	function nearbySystemsResponseHandler(data) {
		if (data) {
			var output = "";
			var systems = 0;

			for (var index=0; index<data.length; index++) {
				if (data[index].name == systemName) {
					continue;
				}

				var distance = _calcDistance(systemCoords, data[index].coords);
				output += data[index].name + "\t(" + Number(distance).toFixed(2) + " ly)\n";
				systems++;
			}

			if (systems == 0) {
				utils.sendMessage(bot, channel, "No systems can be found near " + systemName);
			} else {
				output = systems + " systems found near " + systemName + "\n\n" + output;
				utils.sendMessage(bot, channel, output);
			}
		} else {
			utils.sendMessage(bot, channel, "Something went wrong.");
		}
	}


	var systemName = null;
	var systemCoords = null;
	_getSystemOrCmdrCoords(name, coordinatesResponseHandler);
}

function getNearbySystemsByCoordinates(x,y,z, range, bot, channel) {
	function nearbySystemsResponseHandler(data) {
		if (data) {
			var output = "";
			var systems = 0;

			for (var index=0; index<data.length; index++) {
				var distance = _calcDistance(coords.coords, data[index].coords);
				output += data[index].name + "\t(" + Number(distance).toFixed(2) + " ly)\n";
				systems++;
			}

			if (systems == 0) {
				utils.sendMessage(bot, channel, "No systems can be found near " + _getCoordString(coords));
			} else {
				output = systems + " systems found near " + _getCoordString(coords) + "\n\n" + output;
				utils.sendMessage(bot, channel, output);
			}
		} else {
			utils.sendMessage(bot, channel, "Something went wrong.");
		}
	}

	var coords = {
		'coords': {
			'x': x,
			'y': y,
			'z': z
		}
	};

	utils.sendMessage(bot, channel, "This may take a while...");
	_getNearbySystemsByCoordinates(coords.coords, range, nearbySystemsResponseHandler);
}

function getWaypoints(origin, destination, range, bot, channel, jumpRange) {
	var orgRange = range;

	var outputArray = [];

	const includeCoords = false;

	function originCoordsResponseHandler(coords, isSystem) {
		if (coords) {
			if (coords.coords == undefined) {
				var name = origin;

				if (coords.name) {
					name = coords.name;
				}

				utils.sendMessage(bot, channel, "Coodinates for " + name + " are unknown.");
				return;
			}

			originSystem = coords;
			_getSystemOrCmdrCoords(destination, destinationCoordsResponseHandler);
		} else {
			utils.sendMessage(bot, channel, "Sorry, " + origin + " could not be located.");
		}
	}

	function destinationCoordsResponseHandler(coords, isSystem) {
		if (coords) {
			if (coords.coords == undefined) {
				var name = destination;

				if (coords.name) {
					name = coords.name;
				}

				utils.sendMessage(bot, channel, "Coordinates for " + name + " are unknown.");
				return;
			}

			utils.sendMessage(bot, channel, "This may take a while...");
			destinationSystem = coords;
			var distance = _calcDistance(originSystem.coords, destinationSystem.coords);
			currentOriginCoords = originSystem.coords;

			// If we have a jumpRange, then calculate the range based on distance to sagA
			if (jumpRange) {
				var sagAkly = Math.round(_calcDistance(originSystem.coords, sagACoords.coords) / 1000);
				if (sagAkly <= 12) {
					var res = _calcJumpRange(jumpRange, sagAkly, orgRange);
					range = res.estRange + res.marginOfError;
				} else {
					range = orgRange;
				}
			}

			currentCoords = _calculateStep(currentOriginCoords, destinationSystem.coords, range);
			waypointNo = 0;
			outputArray.push("#0\t" + originSystem.name + "\t(Distance: 0ly)\t(Distance from " + destinationSystem.name + ": " + Number(distance).toFixed(2) + " ly)");
			if (includeCoords) {
				outputArray.push("\t\t" + JSON.stringify(currentCoords));
			}

			if (currentCoords == destinationSystem.coords) {
				utils.sendMessages(bot, channel, outputArray);
			} else {
				_getNearbySystemsByCoordinates(currentCoords, searchRadius, nearbySystemsResponseHandler);
			}
		} else {
			utils.sendMessage(bot, channel, "Sorry, " + destination + " could not be located.");
		}
	}

	function nearbySystemsResponseHandler(data) {
		if (data) {
			var bestSystem = null;
			var bestSystemDistance = null;

			for (var index=0; index<data.length; index++) {
				if (data[index].coords == undefined) {
					continue;
				}

				var distance = _calcDistance(currentOriginCoords, data[index].coords);

				if (distance > range) {
					continue;
				}

				if (bestSystemDistance == null || distance > bestSystemDistance) {
					bestSystem = data[index];
					bestSystemDistance = distance;
				}
			}

			waypointNo++;

			var output = "";

			if (bestSystem == null) {
				var distance = _calcDistance(currentOriginCoords, currentCoords);
				output = "#" + waypointNo + "\tX: " + Number(currentCoords.x).toFixed(2) + ", Y: " + Number(currentCoords.y).toFixed(2) + ", Z: " + Number(currentCoords.z).toFixed(2) + "\t(Distance: " + Number(distance).toFixed(2) + " ly)";
			} else {
				currentCoords = bestSystem.coords;
				output = "#" + waypointNo + "\t" + bestSystem.name + "\t(Distance: " + Number(bestSystemDistance).toFixed(2) + " ly)";
			}

			var destinationDistance = _calcDistance(currentCoords, destinationSystem.coords);
			output += "\t(Distance to " + destinationSystem.name + ": " + Number(destinationDistance).toFixed(2) + " ly)";

			outputArray.push(output);
			if (includeCoords) {
				outputArray.push("\t\t" + JSON.stringify(currentCoords));
			}

			currentOriginCoords = currentCoords;

			// If we have a jumpRange, then calculate the range based on distance to sagA
			if (jumpRange) {
				var sagAkly = Math.round(_calcDistance(currentCoords, sagACoords.coords) / 1000);
				if (sagAkly <= 12) {
					var res = _calcJumpRange(jumpRange, sagAkly, orgRange);
					range = res.estRange + res.marginOfError;
				} else {
					range = orgRange;
				}
			}

			currentCoords = _calculateStep(currentOriginCoords, destinationSystem.coords, range);

			if (currentCoords == destinationSystem.coords) {
				waypointNo++;

				outputArray.push("#" + waypointNo + "\t" + destinationSystem.name + "\t(Distance: " + Number(destinationDistance).toFixed(2) + " ly)");
				if (includeCoords) {
					outputArray.push("\t\t" + JSON.stringify(destinationSystem.coords));
				}
				utils.sendMessages(bot, channel, outputArray);
				outputArray = [];
			} else {
				_getNearbySystemsByCoordinates(currentCoords, searchRadius, nearbySystemsResponseHandler);
			}
		} else {
			outputArray.push("Something's wrong...");
			utils.sendMessages(bot, channel, outputArray);
			outputArray = [];
		}
	}

	var originSystem = null;
	var destinationSystem = null;
	var currentOriginCoords = null;
	var currentCoords = null;
	var output = "";
	var waypointNo = null;
	var searchRadius = 50;
	var sagACoords = {name: "Sagittarius A*", coords: {x: 25.21875, y: -20.90625, z: 25899.96875 }};

	_getSystemOrCmdrCoords(origin, originCoordsResponseHandler);
}

function __calcJumpRange(jumpRange, distSagA, distMax) {
	var N = Math.floor(distMax / jumpRange);
	var M = N * jumpRange;
	return M - ((N/4) + (distSagA * 2));
}

function _calcJumpRange(jumpRange, distSagA, distMax) {
	if ((!distMax) || (distMax > 1000.0)) {
		distMax = 1000.0;
	} 

	if (distSagA > 100.0) {
		// Assume we've mistakenly gotten a distance in ly, not kly
		distSagA /= 1000.0;
	}

	var estRange = __calcJumpRange(jumpRange, distSagA, distMax);
	if (estRange <= 0) {
		return "Error: Calculation resulted in a negative distance. Please check your input.";
	}
	if (distMax < 1000) {
		var maxRange = distMax;
		while(true) {
			distMax += jumpRange;
			var improvement = __calcJumpRange(jumpRange, distSagA, distMax);
			if (improvement > maxRange) {
				break;
			}
			estRange = improvement;
		}
	}
	var marginOfError = estRange * 0.0055;
	return {estRange: estRange, marginOfError: marginOfError};
}

function calcJumpRange(jumpRange, distSagA, distMax) {
	var res = _calcJumpRange(jumpRange, distSagA, distMax);
	var output = "Estimated plot range should be around **";
	output += res.estRange.toFixed(2);
	output += "ly** - check range *";
	output += (res.estRange - res.marginOfError).toFixed(2);
	output += " to ";
	output += (res.estRange + res.marginOfError).toFixed(2);
	output += " ly*";
	return output;
}

exports.getPosition = getPosition;
exports.getPositionString = getPositionString;
exports.getSystemCoords = getSystemCoords;
exports.getCmdrCoords = getCmdrCoords;
exports.getDistance = getDistance;
exports.aliases = aliases;
exports.cmdraliases = cmdraliases;
exports.normalizeSystem = normalizeSystem;
exports.calcDistance = _calcDistance;
exports.getSystemCoordsAsync = _getSystemCoords;
exports.getNearbySystems = getNearbySystems;
exports.getNearbySystemsByCoordinates = getNearbySystemsByCoordinates;
exports.getWaypoints = getWaypoints;
exports.calcJumpRange = calcJumpRange;