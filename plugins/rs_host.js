// This is a generic rivescript host. It manages its own state and memory.
'use strict';

var utils = require('../server/utils.js');
var RiveScript = require("rivescript");
var fs = require("fs");
var async = require('async');
var _ = require('underscore');

exports.RSHost = RSHost;
function RSHost(userDataDir, memoryPrefix, options) {
	this.userDataDir = normalizePath(userDataDir);
	this.lastMessages = [];
	this.undefinedMessages = [];
	this.memoryPrefix = normalizePath(memoryPrefix);	// A scoping prefix for memory management
	this.botStarted = false;
	this.rsBot = new RiveScript(options);

    function normalizePath(path) {
    	if (path) {
    		if (path.endsWith('/') === false) {
	    		path += '/';
	    	}
    	}
    	return path;
    }
}

RSHost.prototype.setup = function(rivescriptArray, callback) {
	var that = this;
    // Now load the rivescript
    async.eachSeries(rivescriptArray, loadDirectory, function() {
    	// All done!
		// Now the replies must be sorted!
		console.log("Sorting...")
	    that.rsBot.sortReplies();

	    that.botStarted = true;
	    if (callback) {
	    	callback();
	    }
	    console.log("Ready!");
    });

    function loadDirectory(rs, cb) {
    	that.rsBot.loadDirectory(rs, function(batch_num) {
    		console.log("Batch #" + batch_num + " has finished loading!");
    		cb();
    	}, function(error) {
    		utils.logError("Error when loading files: " + error, error);
    		cb();
    	});
    }
}

// PMs the last few snippets of conversation between people and Jaques to the caller. For debugging the bot.
RSHost.prototype.gossip = function() {
	var msgs = [];
	_.each(this.undefinedMessages, function(item) {
		msgs.push(item.user + " said: " + item.statement);
        msgs.push("And the bot said: " + item.reply);
	});
	_.each(this.lastMessages, function(item) {
		msgs.push(item.user + " said: " + item.statement);
		msgs.push("And the bot said: " + item.reply);
	});
	return msgs;
}

// Talk to the bot
RSHost.prototype.reply = function(statement, name, userid) {
	if (this.botStarted) {							
		var reply = this.getReply(userid, name, statement);
		reply = this.stripGarbage(reply);                
		var cache = {user: name, statement: statement, reply: reply};
        if (reply.includes("undefined")) {
            this.undefinedMessages.push(cache);   
        }
		this.lastMessages.push(cache);
		while (this.lastMessages.length > 10) {
			this.lastMessages.shift();
		}
		return reply;
	} else {
		return "Sorry I'm still waking up...";
	}
}

RSHost.prototype.setSubroutine = function(identifier, callback) {
	this.rsBot.setSubroutine(identifier, callback);
}

RSHost.prototype.getUservar = function(userid, varId) {
	return this.rsBot.getUservar(userid, varId);
}

// The meat of the logic is in here. This function gets a reply from the bot,
// and persists user data to disk as a local file named "./$USERNAME.json"
// where $USERNAME is the username.
RSHost.prototype.getReply = function(userid, username, message) {
    var filename = this.userDataDir;
    if (this.memoryPrefix) {
    	filename += this.memoryPrefix;
    }
    filename += (userid + ".json");

    // See if the bot knows this user yet (in its current memory).
    var userData = this.rsBot.getUservars(userid);
    if (!userData) {
        // See if a local file exists for stored user variables.
        try {
            var stats = fs.statSync(filename);
            if (stats) {
                var jsonText = fs.readFileSync(filename);
                userData = JSON.parse(jsonText);
                this.rsBot.setUservars(userid, userData);
            }
        } catch(e) {}
    }
    // Ensure there's a memory
    if (this.rsBot.getUservar(userid, "memory") == "undefined") {
        this.rsBot.setUservar(userid, "memory", "But you haven't taught me anything memorable.");
    }
    // Get a reply.
    // We'll scope everything per-user...
	if (this.rsBot.getUservar(userid, "name") == "undefined") {
		this.rsBot.setUservar (userid, "name", username);
	}
    var reply = this.rsBot.reply(userid, message);
    // Rarely do we have a reply that looks like this: "}"
    if (reply == "}") {
        reply = "...";
    }

    // Export user variables to disk.
    userData = this.rsBot.getUservars(userid);
    fs.writeFile(filename, JSON.stringify(userData, null, 2), function(err) {
        if (err) {
            console.error("Failed to write file", filename, err);
        }
    });

    return reply;
}

// These functions are gross, but I don't know why I'm seeing garbage in the reply strings. This will take care of them for now...
function __stripGarbage(text, patt, repl) {
    while (text.includes(patt)) {
        text = text.replace(patt, repl);
    } 
    return text;
}

function _stripGarbage(text, toStrip) {
    var strip = [
        {patt: ". " + toStrip + ".", repl: "."},
        {patt: "! " + toStrip + ".", repl: "!"},
        {patt: "? " + toStrip + ".", repl: "?"},
        {patt: ". " + toStrip, repl: "."},
        {patt: "! " + toStrip, repl: "!"},
        {patt: "? " + toStrip, repl: "?"}
    ];

    for (var i = 0; i < strip.length; i++) {
        text = __stripGarbage(text, strip[i].patt, strip[i].repl);
    }
    return text;
}

RSHost.prototype.stripGarbage = function(text) {
    // Some strings end in "  random" or "  inquiry". Strip these. There may be multiples, but they don't seem to mix.
    text = __stripGarbage(text, "  ", " ");
    text = _stripGarbage(text, "random");
    text = _stripGarbage(text, "inquiry");
    text = text.replace("..", ".");
    text = text.replace("?.", "?");
    text = text.replace("!.", "!");
    text = text.replace(". .", ".");
    text = text.replace("? .", "?");
    text = text.replace("! .", "!");
    text = text.replace(" .", ".");
    text = text.replace(" ?", "?");
    text = text.replace(" !", "!");
    return text;
}
