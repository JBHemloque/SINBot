'use strict';

var base = require('../base.js');
var path = require('path');
var fs = require("fs");
var utils = require('../server/utils.js');

var commands = {
    "add_event": {
        usage: "add_event <event name> <event time>",
        // adminOnly: true,
        help: "Creates a timed event. Note: The format for <event time> is covered in RFC 2822 ('dd/Mon/yyyy HH:mm:ss' as a UTC date is safe)",
        process: function(args, bot, message) {            
            // Get rid of the command
            args.shift();
            if (args.length > 1) {
                var eventName = args.shift();
                var eventTime = args.join(" ");
                if (addEvent(eventName, eventTime)) {
                    utils.sendMessage(bot, message.channel, "Created event " + eventName + " at " + eventTime);
                } else {
                    utils.displayUsage(bot,message,this);
                }
            } else {
                utils.displayUsage(bot,message,this);
            }
        }
    },
    "remove_event": {
        usage: "remove_event <event name> <event time>",
        // adminOnly: true,
        help: "Removes a timed event.",
        process: function(args, bot, message) {
            // Get rid of the command
            args.shift();
            if (args.length == 1) {
                var eventName = args.shift();
                if (removeEvent(eventName)) {
                    utils.sendMessage(bot, message.channel, "Removed event " + eventName);
                } else {
                    utils.displayUsage(bot,message,this);
                }
            } else {
                utils.displayUsage(bot,message,this);
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
                utils.sendMessage(bot, message.channel, output);
            } else {
                utils.displayUsage(bot, message, this);
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
                outputArray[i++] = "\t" + key + ": " + (new Date(events[key].time).toISOString());
                hasEvents = true;
            }
            if (!hasEvents) {
                outputArray[0] += " None";
            }
            utils.sendMessages(bot, message.channel, outputArray);
        }
    },
};

exports.commands = commands;

exports.findCommand = function(command) {
    return commands[command];
}

var events;

try{
    console.log('  - Loading ' + path.resolve(base.path, "events.json"));
    events = require(path.resolve(base.path, "events.json"));
} catch(e) {
    console.log('  - No events');
    events = {};
}

function updateEvents() {
    fs.writeFile(path.resolve(base.path, "events.json"),JSON.stringify(events,null,2), null);
}

function addEvent(eventName, eventDateTime) {
    var eventTime = Date.parse(eventDateTime);
    if (eventTime != NaN) {
        var event = {
            name: eventName,
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

function formatTimeDiff(diff) {
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -=  days * (1000 * 60 * 60 * 24);

    var hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);

    var mins = Math.floor(diff / (1000 * 60));
    diff -= mins * (1000 * 60);

    var seconds = Math.floor(diff / (1000));
    diff -= seconds * (1000);

    var output = "";
    if (days > 0) {
        output += days;
        output += " days, ";
    }
    if (hours > 0) {
        output += hours;
        output += " hours, ";
    }
    if (mins > 0) {
        output += mins;
        output += " minutes, ";
    }
    output += seconds;
    output += " seconds";
    return output;
}

function timeUntilEvent(eventName) {
    if (events[eventName]) {
        var event = events[eventName];
        var now = new Date().getTime();
        if (now > event.time) {
            return "'" + eventName + "' has already happened.";
        } else {
            var diff = event.time - now;
            return eventName + " will begin in " + formatTimeDiff(diff);
        }
    } else {
        return "Event '" + eventName + "' is not a valid event.";
    }
}