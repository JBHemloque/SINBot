var google = require('googleapis');
var config = require('./config.js');
var summary = require('node-sumuparticles');

var customsearch = google.customsearch('v1');



exports.precis = function(arg, bot, message) {
	// Lodestone first, then wiki
	var that = this;
	that.searchLodestone(arg, function(result) {
		console.log("Got lodestone result: " + result);
		if (result) {
			bot.sendMessage(message.channel, result);
		}
		that.searchWiki(arg, function(result) {
			if (result) {
				bot.sendMessage(message.channel, result);
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

exports.searchLodestone = function(arg, callback) {
	var searchTerms = arg;
	customsearch.cse.list({ cx: config.LODESTONE_CX, q: config.LODESTONE_SERVER + " " + searchTerms, auth: config.API_KEY }, function(err, resp) {
		if (err) {
			console.log('An error occured', err);
			callback(errorFor("Lodestone", searchTerms, err));
			return;
		}
		// Got the response from custom search
		// console.log('Lodestone results: ' + resp.searchInformation.formattedTotalResults);
		if (resp && resp.items && resp.items.length > 0) {
//			console.log(resp);
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

exports.searchWiki = function(arg, callback) {
	var searchTerms = arg;
	customsearch.cse.list({ cx: config.WIKI_CX, q: searchTerms, auth: config.API_KEY }, function(err, resp) {
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