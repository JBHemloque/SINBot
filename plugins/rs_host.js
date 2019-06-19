// This is a generic rivescript host. It manages its own state and memory.
'use strict';

var path = require('path');
var RiveScript = require("rivescript");
var fs = require("fs");
var async = require('async');
var _ = require('underscore');
var base = require(path.resolve(__dirname, '../base.js'));
var utils = require(path.resolve(base.path, 'server/utils.js'));

exports.RSHost = RSHost;
function RSHost(userDataDir, memoryPrefix, options) {
    this.userDataDir = normalizePath(userDataDir);
    this.lastMessages = [];
    this.undefinedMessages = [];
    this.memoryPrefix = normalizePath(memoryPrefix);    // A scoping prefix for memory management
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

RSHost.prototype.setup = function(rivescriptArray) {
    var that = this;
    return new Promise(function(resolve, reject) {
        // Now load the rivescript
        async.eachSeries(rivescriptArray, loadDirectory)
        .then(function() {
            // All done!
            // Now the replies must be sorted!
            console.log("Sorting...")
            that.rsBot.sortReplies();

            that.botStarted = true;
            console.log("Ready!");
            resolve();
        });

        function loadDirectory(rs, cb) {
            console.log("Loading directory '" + rs + "'...");
            that.rsBot.loadDirectory(rs)
            .then(function() {
                console.log("Batch loaded...");
                cb();
            })
            .catch(function(error) {
                utils.logError("Error when loading files: " + error, error);
                cb();
            });
        }
    });    
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
    var that = this;
    return new Promise(function(resolve, reject) {
        if (that.botStarted) {                            
            that.getReply(userid, name, statement)
            .then(function(reply) {
                reply = that.stripGarbage(reply);                
                var cache = {user: name, statement: statement, reply: reply};
                if (reply.includes("undefined")) {
                    that.undefinedMessages.push(cache);   
                }
                that.lastMessages.push(cache);
                while (that.lastMessages.length > 10) {
                    that.lastMessages.shift();
                }
                resolve(reply);
            });            
        } else {
            resolve("Sorry I'm still waking up...");
        }
    });    
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
    var that = this;
    return new Promise(function(resolve, reject) {
        var filename = that.userDataDir;
        if (that.memoryPrefix) {
            filename += that.memoryPrefix;
        }
        filename += (userid + ".json");

        // See if the bot knows this user yet (in its current memory).
        that.rsBot.getUservars(userid)
        .then(function(userData) {
            if (!userData) {
                // See if a local file exists for stored user variables.
                try {
                    var stats = fs.statSync(filename);
                    if (stats) {
                        var jsonText = fs.readFileSync(filename);
                        userData = JSON.parse(jsonText);
                        that.rsBot.setUservars(userid, userData);
                    }
                } catch(e) {}
            }           
            // Ensure there's a memory
            that.rsBot.getUservar(userid, "memory")
            .then(function(memory) {
                if (memory === "undefined") {
                    that.rsBot.setUservar(userid, "memory", "But you haven't taught me anything memorable.");
                }
                
                // We'll scope everything per-user...
                that.rsBot.getUservar(userid, "name")
                .then(function(memory) {
                    if (memory === "undefined") {
                        that.rsBot.setUservar (userid, "name", username);
                    }

                    // Get a reply.
                    that.rsBot.reply(userid, message)
                    .then(function(reply) {
                        // Rarely do we have a reply that looks like this: "}"
                        if (reply == "}") {
                            reply = "...";
                        }

                        // Export user variables to disk.
                        userData = that.rsBot.getUservars(userid);
                        fs.writeFile(filename, JSON.stringify(userData, null, 2), function(err) {
                            if (err) {
                                console.error("Failed to write file", filename, err);
                            }
                        });

                        that.rsBot.lastMatch(userid).then(function(match) {
                            console.log("Last match: " + match);
                        });

                        resolve(reply);
                    });
                });
            });
        });        
    });
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
