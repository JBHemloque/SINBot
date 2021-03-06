'use strict';

var base = require('../base.js');
var path = require('path');
var fs = require("fs");
var utils = require('../server/utils.js');

var commands = {
    "add_event": {
        usage: "add_event <event> <event name> -> <event time>",
        adminOnly: true,
        help: "Creates a timed event. Note: The format for <event time> is covered in RFC 2822 ('dd/Mon/yyyy HH:mm:ss' as a UTC date is safe)",
        process: function(args, bot, message) {            
            // Get rid of the command
            args.shift();
            var displayUsage = true;
            if (args.length > 2) {
                var eventName = args.shift();
                var extra = args.join(" ").split(" -> ");
                console.log("Extra: " + JSON.stringify(extra));
                var eventPrettyName = extra.shift();
                var eventTime = extra.shift();
                console.log(eventPrettyName + " : " + eventTime);
                if (eventName && eventPrettyName && eventTime) {
                    if (addEvent(eventName, eventPrettyName, eventTime)) {
                        return utils.sendMessage(bot, message.channel, "Created event " + eventName + " at " + eventTime);
                    }
                }
            } 
            return utils.displayUsage(bot,message,this);
        }
    },
    "remove_event": {
        usage: "remove_event <event name> <event time>",
        adminOnly: true,
        help: "Removes a timed event.",
        process: function(args, bot, message) {
            // Get rid of the command
            args.shift();
            if (args.length == 1) {
                var eventName = args.shift();
                if (removeEvent(eventName)) {
                    return utils.sendMessage(bot, message.channel, "Removed event " + eventName);
                } else {
                    return utils.displayUsage(bot,message,this);
                }
            } else {
                return utils.displayUsage(bot,message,this);
            }
        }
    },
    "event": {
        usage: "event <event name>",
        help: "Displays the time remaining until <event name>",
        process: function(args, bot, message) {
            // Get rid of the command
            args.shift();
            if (args.length == 1) {
                var eventName = args.shift();
                var output = timeUntilEvent(eventName);
                return utils.sendMessage(bot, message.channel, output);
            } else {
                return utils.displayUsage(bot, message, this);
            }
        }
    },
    "events": {
        usage: "events",
        help: "Lists the events in this system along with their times",
        process: function(args, bot, message) {
            var key;
            var i = 0;
            var outputArray = [];
            outputArray[i++] = utils.bold("Events:");
            var hasEvents = false;
            for (key in events) {
                outputArray[i++] = "\t" + key + ": " + events[key].name + " at " + (new Date(events[key].time).toISOString());
                hasEvents = true;
            }
            if (!hasEvents) {
                outputArray[0] += " None";
            }
            return utils.sendMessages(bot, message.channel, outputArray);
        }
    },
};

exports.commands = commands;

exports.findCommand = function(command) {
    return commands[command];
}

var events;

try{
    utils.debugLog('  - Loading ' + path.resolve(base.path, "events.json"));
    events = require(path.resolve(base.path, "events.json"));
} catch(e) {
    console.log('  - No events');
    events = {};
}

function updateEvents() {
    fs.writeFile(path.resolve(base.path, "events.json"),JSON.stringify(events,null,2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });
}

function addEvent(eventName, eventPrettyName, eventDateTime) {
    var eventTime = Date.parse(eventDateTime);
    if (eventTime != NaN) {
        var event = {
            name: eventPrettyName,
            time: eventTime
        }
        events[eventName] = event;
        updateEvents();
        return true;
    } 
    return false;
}

function removeEvent(eventName) {
    if (events[eventName]) {
        delete events[eventName];
        updateEvents();
        return true;
    }
    return false;
}

function timeUntilEvent(eventName) {
    if (events[eventName]) {
        var event = events[eventName];
        var now = new Date().getTime();
        if (now > event.time) {
            return "'" + event.name + "' has already happened.";
        } else {
            var diff = event.time - now;
            return event.name + " will begin in " + utils.formatTimeDuration(diff);
        }
    } else {
        return "Event '" + eventName + "' is not a valid event.";
    }
}