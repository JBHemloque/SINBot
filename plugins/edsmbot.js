var Client = require('node-rest-client').Client;
 
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
 
var getPosition = function(commander, bot, message) {
	_getSystem(commander, function(data) {
		bot.sendMessage(message.channel, _getPositionString(commander, data));
	});
}

var _getSystemCoords = function(system, callback) {
	client.get("http://www.edsm.net/api-v1/system?systemName=" + normalizeSystem(system) + "&coords=1", function (data, response) {		
		if (data) {
			if (!data.name) {
				data = null;
			}
			callback(data);
		}
	}).on('error', function (err) {
		console.log("Error");
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
	_getSystemCoords(query, function(coords) {
		if (coords) {
			// console.log(query + " is a system");
			callback(coords, false);
		} else {
			_getCommanderCoords(query, function(coords) {
				// if (coords) {
				// 	console.log(query + " is a commander");
				// } else {
				// 	console.log("Could not find " + query);
				// }
				callback(coords, true);
			});
		}
	});
}

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

exports.getPosition = getPosition;
exports.getSystemCoords = getSystemCoords;
exports.getCmdrCoords = getCmdrCoords;
exports.getDistance = getDistance;
exports.aliases = aliases;
exports.cmdraliases = cmdraliases;