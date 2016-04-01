'use strict';

//////////////////////////
//
// A minimal plugin which does nothing
//
//////////////////////////

var commands = { };

exports.commands = commands;

exports.findCommand = function(command) {
	return commands[command];
}