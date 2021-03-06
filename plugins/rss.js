'use strict';

var request = require('request');
var FeedParser = require('feedparser');
var Iconv = require('iconv').Iconv;
var fs = require("fs");
var utils = require("../server/utils");
var base = require('../base.js');
var path = require('path');

var feeds;
var discord;

var old_guids;
try{
    utils.debugLog('  - Loading ' + path.resolve(base.path, "old_rss_guids.json"));
    old_guids = require(path.resolve(base.path, "old_rss_guids.json"));
    console.log("Read old guids:");
    console.log(JSON.stringify(old_guids));
} catch(e) {
    //No aliases defined
    console.log("Couldn't read old guids");
    old_guids = {};
}

function addGuid(guid){
    old_guids[guid] = guid;
    // This path differs from the one above because the context it's run from is different
    fs.writeFile(path.resolve(base.path, "old_rss_guids.json"),JSON.stringify(old_guids,null,2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });
}

exports.findCommand = function(command) {
    return null;
}

exports.setup = function(config, bot, botcfg) {
    discord = bot;
    feeds = config.feeds;
    setTimeout(pollFeeds, 1000*10*1);
}

function pollFeeds() {
    for (var i = 0; i < feeds.length; i++) {
        fetch(feeds[i].url, feeds[i].server, feeds[i].channel, feeds[i].message, feeds[i].prefix, feeds[i].suffix);
    }
    setTimeout(pollFeeds, 1000*60*5); //every 5 minutes minute
}

function fetch(feed, server, channel, message, prefix, suffix) {
    // Define our streams
    var req = request(feed, { timeout: 10000, pool: false });
    req.setMaxListeners(50);
    // Some feeds do not respond without user-agent and accept headers.
    req.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36');
    req.setHeader('accept', 'text/html,application/xhtml+xml');

    var feedparser = new FeedParser();

    // Define our handlers
    req.on('error', done);
    req.on('response', function(res) {
        if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
        var charset = getParams(res.headers['content-type'] || '').charset;
        res = maybeTranslate(res, charset);
        // And boom goes the dynamite
        res.pipe(feedparser);
    });

    feedparser.on('error', done);
    feedparser.on('end', done);
    feedparser.on('readable', function() {
        var post;
        while (post = this.read()) {
            var guid = post.guid;
            if (guid) {
                if (old_guids[guid]) {
                    console.log("Skipping " + post.link + " because we know it.");
                } else {
                    var msg = "";
                    if (message) {
                        msg = message;
                        msg = msg.replace('<link/>', post.link);
                        msg = msg.replace('<title/>', post.title);
                        msg = msg.replace('<description/>', post.description);
                        msg = msg.replace('<pubDate/>', post.pubDate);
                        msg = msg.replace('<comments/>', post.comments);
                        msg = msg.replace('<guid/>', post.guid);
                    } else {
                        if (prefix) {
                            msg += prefix;
                        }
                        msg += post.link;
                        if (suffix) {
                            msg += suffix;
                        }
                    }
                    utils.sendMessageToServerAndChannel(discord, server, channel, msg)
                        .then(function(result, error) {
                            if (!error) {
                                addGuid(guid);
                            }
                        });
                }
            } else {
                console.log("Oops, no guid for this item: " + post.link);
            }            
        }
    });
}

function maybeTranslate(res, charset) {
    var iconv;
    // Use iconv if its not utf8 already.
    if (!iconv && charset && !/utf-*8/i.test(charset)) {
        try {
            iconv = new Iconv(charset, 'utf-8');
            console.log('Converting from charset %s to utf-8', charset);
            iconv.on('error', done);
            // If we're using iconv, stream will be the output of iconv
            // otherwise it will remain the output of request
            res = res.pipe(iconv);
        } catch (err) {
            res.emit('error', err);
        }
    }
    return res;
}

function getParams(str) {
    var params = str.split(';').reduce(function(params, param) {
        var parts = param.split('=').map(function(part) {
            return part.trim(); });
        if (parts.length === 2) {
            params[parts[0]] = parts[1];
        }
        return params;
    }, {});
    return params;
}

function done(err) {
    if (err) {
        console.log(err, err.stack);
    }
}
