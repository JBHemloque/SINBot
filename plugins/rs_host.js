// This is a generic rivescript host. It manages its own state and memory.
'use strict';

const path = require('path');
const RiveScript = require("rivescript");
const fs = require("fs");
const async = require('async');
const _ = require('underscore');
const base = require(path.resolve(__dirname, '../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));

exports.RSHost = RSHost;
function RSHost(userDataDir, memoryPrefix, options, redishost, redisport, redisprefix) {
    this.userDataDir = normalizePath(userDataDir);
    this.lastMessages = [];
    this.undefinedMessages = [];
    this.memoryPrefix = normalizePath(memoryPrefix);    // A scoping prefix for memory management
    this.botStarted = false;
    this.useSessionManager = (options && options.sessionManager) ? true : false;

    if (!options) {
        options = {
            utf8: true
        }
    }

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
            utils.debugLog("Sorting...")
            that.rsBot.sortReplies();

            that.botStarted = true;
            utils.debugLog("Ready!");
            resolve();
        });

        function loadDirectory(rs, cb) {
            utils.debugLog("Loading directory '" + rs + "'...");
            that.rsBot.loadDirectory(rs)
            .then(function() {
                utils.debugLog("Batch loaded...");
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

///////////////////////////////////////////////////////////////////////////////
// The meat of the logic is in here. This function gets a reply from the bot.
// Pre 2.7.2, user data was persisted to disk as a local file named "./$USERNAME.json"
// where $USERNAME is the username, but from 2.7.2+ we're allowing the option of using 
// a session manager to store user data, with the understanding that 
// it will be configured to persist the data. 
///////////////////////////////////////////////////////////////////////////////
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
            if (userData && !userData.memory) {
                that.rsBot.setUservar(userid, "memory", "But you haven't taught me anything memorable.");    
            }
            // And a name, if possible
            if (userData && !userData.name && username) {
                that.rsBot.setUservar (userid, "name", username);
            }
            // Now we're ready to get a reply
            that.rsBot.reply(userid, message)
            .then(function(reply) {
                // Rarely do we have a reply that looks like this: "}"
                if (reply == "}") {
                    reply = "...";
                }

                // Export user variables to disk if we're not using a session manager
                if (!that.useSessionManager) {
                    userData = that.rsBot.getUservars(userid);
                    fs.writeFile(filename, JSON.stringify(userData, null, 2), function(err) {
                        if (err) {
                            utils.logError("Failed to write file", filename, err);
                        }
                    });
                }

                // that.rsBot.lastMatch(userid).then(function(match) {
                //     console.log("Last match: " + match);
                // });

                resolve(reply);
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
