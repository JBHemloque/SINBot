var google = require('googleapis');
var config = require('./config.js');

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

exports.searchLodestone = function(arg, callback) {
	searchTerms = config.LODESTONE_SERVER + " " + arg;
	customsearch.cse.list({ cx: config.LODESTONE_CX, q: searchTerms, auth: config.API_KEY }, function(err, resp) {
		if (err) {
			console.log('An error occured', err);
			callback(null);
		}
		// Got the response from custom search
		console.log('Lodestone results: ' + resp.searchInformation.formattedTotalResults);
		if (resp.items && resp.items.length > 0) {
//			console.log(resp);
			callback(resp.items[0].link);
		} else {
			callback(null);
		}
	});
}

exports.searchWiki = function(arg, callback) {
	searchTerms = arg;
	customsearch.cse.list({ cx: config.WIKI_CX, q: searchTerms, auth: config.API_KEY }, function(err, resp) {
		if (err) {
			console.log('An error occured', err);
			callback(null);
		}
		// Got the response from custom search
		console.log('Wiki results: ' + resp.searchInformation.formattedTotalResults);
		if (resp.items && resp.items.length > 0) {
//			console.log(resp);
			callback(resp.items[0].link);
		} else {
			callback(null);
		}
	});
}