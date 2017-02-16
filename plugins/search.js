'use strict';

var google = require('googleapis');
var summary = require('node-sumuparticles');

var customsearch = google.customsearch('v1');

var utils = require('../server/utils.js');

var config;

var enumerate = function(obj) {
    var key;
    for (key in obj) {
        if (typeof obj[key] !== 'function') {
            console.log(key + ": " + obj[key]);
        }
    }
}

var commands = {
    "precis": {
        usage: "<name>",
        help: "Generate a precis on someone. We can generate 50 of these a day before Google stops us.",
        extendedhelp: "A precis is a brief summary of a topic. Used in intelligence, a precis is also a brief document providing information about someone or something. This bot can generate a precis for a character by checking Lodestone and the RPC wiki.",
        process: function(args, bot, message) { 
            precis(utils.compileArgs(args), bot, message); 
        }
    },
};

exports.commands = commands;

exports.findCommand = function(command) {
    return commands[command];
}

exports.setup = function(c, bot) {
    config = c;
}

var precis = function(arg, bot, message) {
    // Lodestone first, then wiki
    searchLodestone(arg, function(result) {
        console.log("Got lodestone result: " + result);
        if (result) {
            utils.sendMessage(bot, message.channel, result);
        }
        searchWiki(arg, function(result) {
            if (result) {
                utils.sendMessage(bot, message.channel, result);
            }
        });
    });
}

var errorFor = function(searchType, searchTerms, error) {
    var msg = "No " + searchType + " results for " + searchTerms;
    if (error && error.errors && error.errors[0] && error.errors[0].message) {
        msg += (" -- " + error.errors[0].message);
    }
    return msg;
}

var searchLodestone = function(arg, callback) {
    var searchTerms = arg;
    customsearch.cse.list({ cx: config.lodestone_cx, q: config.lodestone_server + " " + searchTerms, auth: config.apikey }, function(err, resp) {
        if (err) {
            console.log('An error occured', err);
            callback(errorFor("Lodestone", searchTerms, err));
            return;
        }
        // Got the response from custom search
        // console.log('Lodestone results: ' + resp.searchInformation.formattedTotalResults);
        if (resp && resp.items && resp.items.length > 0) {
//            console.log(resp);
            callback(resp.items[0].link);
        } else {
            callback(errorFor("Lodestone", searchTerms));
        }
    });
}

var summarize = function(name, url, callback) {
    var searchName = name;
    summary.summarize(url, function(title, summary, failure) {
        if (failure) {
            // console.log("Failure to summarize");
            callback(url);
            return;
        } else {
            var output = errorFor("Wiki", searchName);
            console.log("Got page back for name: " + searchName + " = title: " + title);
            if (searchName === title) {
                output = url + "\n";
                var name;
                for (name in summary) {
                    if (typeof summary[name] !== 'function') {
                        output += "\n";
                        output += summary[name];
                    }
                }
            }        
            callback(output);
        }
    });
}

var searchWiki = function(arg, callback) {
    var searchTerms = arg;
    customsearch.cse.list({ cx: config.wiki_cx, q: searchTerms, auth: config.apikey }, function(err, resp) {
        if (err) {
            console.log('An error occured', err);
            callback(errorFor("Wiki", searchTerms, err));
            return;
        }
        // Got the response from custom search
        // console.log('Wiki results: ' + resp.searchInformation.formattedTotalResults);
        if (resp && resp.items && resp.items.length > 0) {
            // console.log(resp);

            // callback(resp.items[0].link);
            summarize(searchTerms, resp.items[0].link, callback);
        } else {
            callback(errorFor("Wiki", searchTerms));
        }
    });
}