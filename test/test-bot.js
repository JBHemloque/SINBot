var assert = require('assert');
var bot = require("../server/bot.js");
var mocks = require('./mocks.js');

var sleep = mocks.sleep;

function handleUsage(command, user) {
    if (!user) {
        user = mocks.nonAdminUser;
    }
    var sendMessage = function(message) {
        if (message.includes("Usage: ")) {
            handledCommand = true;
        } else {
            console.log("Unexpected usage reply: " + message);
        }
    };
    var handledCommand = false;
    var client = mocks.makeClient();
    bot.startBot(client, mocks.makeConfig());
    bot.procCommand(client, mocks.makeMessage(command, user, sendMessage));
    return handledCommand;
}

function handleAdminCheck(command) {
    var handledCommand = false;
    var client = mocks.makeClient();
    bot.startBot(client, mocks.makeConfig());
    bot.procCommand(client, mocks.makeMessage(command, mocks.nonAdminUser, function(message) {
        if (message.includes("you are not allowed to do that")) {
            handledCommand = true;
        }
    }));
    return handledCommand;
}

describe('bot', function(){
    it('should export a commands object', function(){
        assert(typeof(bot.commands) == 'object');
    });

    it('should export a plugins object', function() {
        assert(typeof(bot.plugins) == 'object');
    });

    it('should export a startBot function', function() {
        assert(typeof(bot.startBot) == 'function');
    });

    it('should export a procCommand function', function() {
        assert(typeof(bot.procCommand) == 'function');
    });

    it('should export a procPresence function', function() {
        assert(typeof(bot.procPresence) == 'function');
    });

    it('should ignore non-command messages', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("Hi, this is an example of a non-command message", function(message) {
            handledCommand = true;
        }));
        assert(handledCommand == false);
    });

    it('should ignore non-command messages starting with bang with bang config', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!naoeuhnoatuehaoeunth", function(message) {
            handledCommand = true;
        }));
        assert(handledCommand == false);
    });

    it('should process commands via calls to itself', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeDirectConfig());
        var message = mocks.makePrivateMessage("ping", mocks.nonAdminUser, bot.user, function(message) {
            if (message == "Pong!") {
                handledCommand = true;
            }
        });
        bot.procCommand(client, message);
        assert(handledCommand);
    });

    it('should process commands via calls to itself when mentioned', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeDirectConfig());
        bot.procCommand(client, mocks.makeMessage("<@" + client.user.id + "> ping", function(message) {
            if (message == "Pong!") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it('should process commands via calls to itself when mentioned, even when renamed', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeDirectConfig());
        bot.procCommand(client, mocks.makeMessage("<@!" + client.user.id + "> ping", function(message) {
            if (message == "Pong!") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it('should process ping', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!ping", function(message) {
            if (message == "Pong!") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it('should process commands in a case-insensitive manner', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!PING", function(message) {
            if (message == "Pong!") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it('should return true for isadmin of an admin user', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!isadmin", mocks.adminUser, function(message) {
            if (message == "true") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it('should return false for isadmin of a non-admin user', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!isadmin", mocks.nonAdminUser, function(message) {
            if (message == "false") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it("shouldn't let non-admin users call exit", function() {
        assert(handleAdminCheck("!exit"));
    });

    it("shouldn't let non-admin users call adminlist", function() {
        assert(handleAdminCheck("!adminlist"));
    });

    it('should include an admin user in the admin list', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!adminlist", mocks.adminUser, function(message) {
            if (message.includes(mocks.adminUser.name && mocks.adminUser.id.toString())) {
                handledCommand = true;
            }
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("shouldn't let non-admin users call userlist", function() {
        assert(handleAdminCheck("!userlist"));
    });

    it('should return both an admin user and a non-admin user in the user list', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!userlist", mocks.adminUser, function(message) {
            if (message.includes(mocks.adminUser.username && 
                mocks.adminUser.id.toString() &&
                mocks.nonAdminUser.username && mocks.nonAdminUser.id.toString())) {
                handledCommand = true;
            }
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("should return a string for the version", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!version", function(message) {
            handledCommand = true;
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("should return a string for help", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!help", function(message) {
            handledCommand = true;
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("should return a string for the uptime", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!uptime", function(message) {
            handledCommand = true;
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("shouldn't let non-admin users call channels", function() {
        assert(handleAdminCheck("!channels"));
    });

    it("should return a string for the channels", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!channels", mocks.adminUser, function(message) {
            handledCommand = true;
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("shouldn't let non-admin users call servers", function() {
        assert(handleAdminCheck("!servers"));
    });

    it("should return a string for the servers", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!servers", mocks.adminUser, function(message) {
            handledCommand = true;
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("should return my id for myid", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!myid", mocks.adminUser, function(message) {
            if (message == mocks.adminUser.id.toString()) {
                handledCommand = true;
            }
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("shouldn't let non-admin users call plugins", function() {
        assert(handleAdminCheck("!plugins"));
    });

    it("should return a string for the plugins", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!plugins", mocks.adminUser, function(message) {
            if (message.includes("Plugins:")) {
                handledCommand = true;
            }
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("should include a loaded plugin for the plugins", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig([{ name: "Simple Commands", path: "./plugins/simple.js" }]));
        bot.procCommand(client, mocks.makeMessage("!plugins", mocks.adminUser, function(message) {
            if (message.includes("Simple Commands")) {
                handledCommand = true;
            }
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("should display a string for the aliases list", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!aliases", function(message) {
            handledCommand = true;
        })).then(function() {
            assert(handledCommand);
        });
    });

    it("should display usage for an incomplete alias", function() {
        assert(handleUsage("!alias", mocks.adminUser));
    });

    it("shouldn't let non-admin users call alias", function() {
        assert(handleAdminCheck("!alias"));
    });

    it("should allow an alias to be set", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        var sm = function(message) {
            if (message == "bar") {
                handledCommand = true;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!alias foo bar", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!foo", sm))
            .then(function() {
                assert(handledCommand);
            });
        });
    });

    it("should treat aliases case-insensitively", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        var sm = function(message) {
            if (message == "bar") {
                handledCommand = true;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!alias foo bar", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!FOO", sm))
            .then(function() {        
                assert(handledCommand);
            });
        });
    });

    it("should allow an alias to use variables", function() {
        // %SENDER%, %CHANNEL%, %SERVER%, %CHANNEL_TOPIC%,%EXTRA%
        var handledCommand = false;
        var client = mocks.makeClient();
        var sm = function(message) {
            var expected = "Non-admin user Text, A Server -- Test TextChannel, here are some extras... here are some extras... A Server SERVER CHANNEL_TOPIC Test TextChannel Non-admin user here are some extras... foo Text";
            if (message == expected) {
                handledCommand = true;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!alias foo %SENDER% %CHANNEL%, %SERVER% -- %CHANNEL_TOPIC%, %EXTRA% %EXTRA% "
            + "%SERVER% SERVER CHANNEL_TOPIC %CHANNEL_TOPIC% %SENDER% %EXTRA% foo %CHANNEL%", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!foo here are some extras...", sm))
            .then(function() {
                assert(handledCommand);
            });
        });
    });

    it("should allow an alias to be rewritten", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        var sm = function(message) {
            if (message == "baz") {
                handledCommand = true;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!alias foo bar", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!alias foo baz", mocks.adminUser, sm))
            .then(function() {                
                bot.procCommand(client, mocks.makeMessage("!foo", sm))
                .then(function() {
                    assert(handledCommand);
                });
            });
        });
    });

    it("should display usage for an incomplete clear_alias", function() {
        assert(handleUsage("!clear_alias", mocks.adminUser));
    });

    it("shouldn't let non-admin users call clear_alias", function() {
        assert(handleAdminCheck("!clear_alias"));
    });

    it("should allow an alias to be cleared", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        var sm = function(message) {
            handledCommand = true;
            if (message == "bar") {
                handledCommand = false;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!alias foo bar", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!clear_alias foo", mocks.adminUser, sm))
            .then(function() {
                bot.procCommand(client, mocks.makeMessage("!foo", sm))
                .then(function() {
                    assert(handledCommand);
                });
            });
        });
    });

    it("should display usage for an incomplete show_alias", function() {
        assert(handleUsage("!show_alias"));
    });

    it("should allow an alias to be listed in show_alias", function() {
        var lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
        var handledCommand = false;
        var client = mocks.makeClient();
        var sm = function(message) {
            if (message == "foo -> " + lorem) {
                handledCommand = true;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        // Make the alias long
        bot.procCommand(client, mocks.makeMessage("!alias foo " + lorem, mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!show_alias foo", sm))
            .then(function() {
                assert(handledCommand);
            });
        });
    });

    it("should display usage for an incomplete say", function() {
        assert(handleUsage("!say"));
    });

    it('should process say', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!say Foo", function(message) {
            if (message == "Foo") {
                handledCommand = true;
            }
        }))
        .then(function() {
            assert(handledCommand);
        });
    });

    it("should display usage for an incomplete announce", function() {
        assert(handleUsage("!announce"));
    });

    it('should process announce', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!announce Foo", function(message, tts) {
            if (message == "Foo" && tts && tts.tts) {
                handledCommand = true;
            }
        }))
        .then(function() {
            assert(handledCommand);
        });
    });

    it('should set a topic', function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!topic Foo", function() {}, function(topic) {
            if (topic == "Foo") {
                handledCommand = true;
            }
        }))
        .then(function() {
            assert(handledCommand);
        });
    });

    it("shouldn't let non-admin users call userid", function() {
        assert(handleAdminCheck("!userid"));
    });

    it("should return a user id for userid", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!userid " + mocks.nonAdminUser.username, mocks.adminUser, function(message) {
            if (message.includes(mocks.nonAdminUser.id)) {
                handledCommand = true;
            }
        }))
        .then(function() {
            assert(handledCommand);
        });
    });

    it("should return my user id for a blank userid", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        bot.procCommand(client, mocks.makeMessage("!userid", mocks.adminUser, function(message) {
            if (message.includes(mocks.adminUser.id)) {
                handledCommand = true;
            }
        }))
        .then(function() {
            assert(handledCommand);
        });
    });

    it("should display usage for an incomplete msg", function() {
        assert(handleUsage("!msg"));
        assert(handleUsage("!msg " + mocks.nonAdminUser.id));
    });

    it("should deliver a msg", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        var sm = function(message, options) {
            if (message.includes("Bob Dobbs, ") && message.includes("left you a message:\nHello!")) {
                handledCommand = true;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        var user = mocks.makeUser("Bob Dobbs", sm);
        bot.procCommand(client, mocks.makeMessage("!msg <@" + user.id + "> Hello!", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!ping", user, sm))
            .then(function() {
                assert(handledCommand);
            });
        });
    });

    it("should deliver a msg via PM", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        var sm = function(message, channel) {
            // This is a mock callback of sendMessage, so it hasn't set up the channel properly, yet.
            // Instead, we'll simply look to see that the channel is the name of the user getting
            // the message.
            if (channel.id === user.id) {
                handledCommand = true;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        var user = mocks.makeUser("Doug Dobbs", sm);
        bot.procCommand(client, mocks.makeMessage("!msg <@" + user.id + "> Hello!", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!ping", user, sm))
            .then(function() {
                assert(handledCommand);
            });
        })
    });

    it("should clear a msg after delivering it.", function() {
        var count = 0;
        var client = mocks.makeClient();
        var sm = function(message) {
            if (message.includes("Joe Dobbs, ") && message.includes("left you a message:\nHello!")) {
                count++;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        var user = mocks.makeUser("Joe Dobbs", sm);
        bot.procCommand(client, mocks.makeMessage("!msg <@" + user.id + "> Hello!", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!ping", user, sm))
            .then(function() {
                bot.procCommand(client, mocks.makeMessage("!ping", user, sm))
                .then(function() {
                    assert(count == 1);
                });
            });
        });
    });

    it("should handle multiple msgs.", function() {
        var count = 0;
        var client = mocks.makeClient();
        var sm = function(message) {
            if (message.includes("Frank Dobbs, ") && message.includes("left you a message:\nHello!")) {
                count++;
            }
            if (message.includes("Frank Dobbs, ") && message.includes("left you a message:\nFoo!")) {
                count++;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        var user = mocks.makeUser("Frank Dobbs", sm);
        bot.procCommand(client, mocks.makeMessage("!msg <@" + user.id + "> Hello!", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!msg <@" + user.id + "> Foo!", mocks.adminUser, sm))
            .then(function() {
                bot.procCommand(client, mocks.makeMessage("!ping", user, sm))
                .then(function() {
                    assert(count = 2)
                });
            });
        });
    });

    it("shouldn't deliver a msg to a different user", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        var sm = function(message, options) {
            if (message.includes("Marco Dobbs, ") && message.includes("left you a message:\nHello!")) {
                handledCommand = true;
            }
        };
        bot.startBot(client, mocks.makeConfig());
        var user = mocks.makeUser("Marco Dobbs", sm);
        bot.procCommand(client, mocks.makeMessage("!msg <@" + user.id + "> Hello!", mocks.adminUser, sm))
        .then(function() {
            bot.procCommand(client, mocks.makeMessage("!ping", mocks.nonAdminUser, sm))
            .then(function() {
                assert(!handledCommand);
                // Clear the message
                bot.procCommand(client, mocks.makeMessage("!ping", user, sm))
                .then(function() {
                    assert(handledCommand);
                });
            });
        });
    });
})