var assert = require('assert');
var bot = require("../server/bot.js");
var mocks = require('./mocks.js');

// {
// 			{
// 				command: "loc Satsuma",
// 				return: "Satsuma was last seen in Ceeckia ZQ-L c24-0 at 2016-04-03 07:12:41"
// 			},
// 			{
// 				command: "syscoords treehouse",
// 				return: "System: Iorant FR-C c26-0 [ -420.125 : -23.28125 : 65338.59375 ]"
// 			},
// 			{
// 				command: "cmdrcoords Satsuma",
// 				return: "Satsuma was last seen in Ceeckia ZQ-L c24-0 at 2016-04-03 07:12:41 [ -1111.5625 : -134.21875 : 65269.75 ]"
// 			},
// 			{
// 				command: "dist Satsuma -> Treehouse",
// 				return: "Distance between Satsuma and Treehouse is 703.66 ly"
// 			}
// 		}

function handleUsage(command, user) {
    if (!user) {
        user = mocks.nonAdminUser;
    }
    // Usage always comes in via PM, so we need to account for that...
    var oldUserSendMessage = user.sendMessage;
    user.sendMessage = function(message) {
        if (message.includes("Usage: ")) {
            handledCommand = true;
        } else {
            console.log("Unexpected usage reply: " + message);
        }
    };
    var handledCommand = false;
    var client = mocks.makeClient();
    bot.startBot(client, mocks.makeConfig([{ name: "Elite", path: "./plugins/elite.js" }]));
    bot.procCommand(client, mocks.makeMessage(command, user));
    user.sendMessage = oldUserSendMessage;
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

function createBot(client, bot) {
    bot.startBot(client, mocks.makeConfig([{ name: "Elite", path: "./plugins/elite.js" }]));
}

describe('edsm', function(){
    it('should export a commands object', function(){
        assert(typeof(bot.commands) == 'object');
    });

    it('should export a plugins object', function() {
        assert(typeof(bot.plugins) == 'object');
    });

    it("should display usage for an incomplete loc", function() {
    	assert(handleUsage("!loc", mocks.adminUser));
    });

    it("should display usage for an incomplete syscoords", function() {
    	assert(handleUsage("!syscoords", mocks.adminUser));
    });

    it("should display usage for an incomplete cmdrcoords", function() {
    	assert(handleUsage("!cmdrcoords", mocks.adminUser));
    });

    it("should display usage for an incomplete dist", function() {
    	assert(handleUsage("!dist", mocks.adminUser));
    	assert(handleUsage("!dist foo ->", mocks.adminUser));
    });

    it("should display usage for an incomplete cmdralias", function() {
        assert(handleUsage("!cmdralias", mocks.adminUser));
        assert(handleUsage("!cmdralias foo", mocks.adminUser));
        assert(handleUsage("!cmdralias foo ->", mocks.adminUser));
    });

    it("should display usage for an incomplete sysalias", function() {
    	assert(handleUsage("!sysalias", mocks.adminUser));
    	assert(handleUsage("!sysalias foo", mocks.adminUser));
    	assert(handleUsage("!sysalias foo ->", mocks.adminUser));
    });

    it("should display usage for an incomplete expsa", function() {
    	assert(handleUsage("!expsa", mocks.adminUser));
    	assert(handleUsage("!expsa foo", mocks.adminUser));
    	assert(handleUsage("!expsa foo ->", mocks.adminUser));
    });

    it("should display usage for an incomplete expa", function() {
    	assert(handleUsage("!expsa", mocks.adminUser));
    	assert(handleUsage("!expa foo", mocks.adminUser));
    	assert(handleUsage("!expa foo ->", mocks.adminUser));
    });

    it("should display usage for an incomplete explist", function() {
    	assert(handleUsage("!explist", mocks.adminUser));
    });

    it("should display usage for an incomplete route", function() {
        assert(handleUsage("!route", mocks.adminUser));
    });

    it("should display usage for a route with just one value", function() {
        assert(handleUsage("!route 33.06", mocks.adminUser));
    });

    it("should display usage for a route with a non-numeric jump", function() {
        assert(handleUsage("!route foo 8", mocks.adminUser));
    });

    it("should display usage for a route with a non-numeric sagA distance", function() {
        assert(handleUsage("!route 33.06 foo", mocks.adminUser));
    });

    it("should display usage for a route with a non-numeric max distance", function() {
        assert(handleUsage("!route 33.06 8 foo", mocks.adminUser));
    });

    it("should calculate a route properly", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        createBot(client, bot);
        bot.procCommand(client, mocks.makeMessage("!route 33.06 8", mocks.nonAdminUser, function(message) {
            if (message == "Estimated plot range should be around **968.30ly** - check range *962.97 to 973.63 ly*") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it("should calculate a route properly with a max distance", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        createBot(client, bot);
        bot.procCommand(client, mocks.makeMessage("!route 34.54 9 980", mocks.nonAdminUser, function(message) {
            if (message == "Estimated plot range should be around **976.41ly** - check range *971.04 to 981.78 ly*") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it("should display usage for an incomplete g", function() {
        assert(handleUsage("!g", mocks.adminUser));
    });

    it("should display usage for a g with only a planet mass", function() {
        assert(handleUsage("!g 1", mocks.adminUser));
    });

    it("should display usage for a g with a non-numeric mass", function() {
        assert(handleUsage("!g foo 6368", mocks.adminUser));
    });

    it("should display usage for a g with a non-numeric radius", function() {
        assert(handleUsage("!g 1 foo", mocks.adminUser));
    });

    it("should calculate g properly for earth", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        createBot(client, bot);
        bot.procCommand(client, mocks.makeMessage("!g 1 6371", mocks.nonAdminUser, function(message) {
            if (message == "The gravity for a planet with 1 Earth masses and a radius of 6371 km is **9.83** m/s^2 or **1.00** g. It has a density of **5.52e+3** kg/m^3.\n**Likely**: AW, HMC, WW\n**Possible**: ELW, MR") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it("should calculate g properly for a near earth", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        createBot(client, bot);
        bot.procCommand(client, mocks.makeMessage("!g 1.1 6371.2", mocks.nonAdminUser, function(message) {
            if (message == "The gravity for a planet with 1.1 Earth masses and a radius of 6371.2 km is **10.81** m/s^2 or **1.10** g. It has a density of **6.07e+3** kg/m^3.\n**Likely**: AW, ELW, HMC, WW\n**Possible**: MR") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it("should calculate g properly for a sub earth", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        createBot(client, bot);
        bot.procCommand(client, mocks.makeMessage("!g 0.25 3456", mocks.nonAdminUser, function(message) {
            if (message == "The gravity for a planet with 0.25 Earth masses and a radius of 3456 km is **8.35** m/s^2 or **0.85** g. It has a density of **8.65e+3** kg/m^3.\n**Likely**: MR\n**Possible**: AW, HMC, WW") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });

    it("should calculate g properly for a super earth", function() {
        var handledCommand = false;
        var client = mocks.makeClient();
        createBot(client, bot);
        bot.procCommand(client, mocks.makeMessage("!g 3.64 8245", mocks.nonAdminUser, function(message) {
            if (message == "The gravity for a planet with 3.64 Earth masses and a radius of 8245 km is **21.36** m/s^2 or **2.17** g. It has a density of **9.27e+3** kg/m^3.\n**Likely**: MR\n**Possible**: AW, HMC, WW") {
                handledCommand = true;
            }
        }));
        assert(handledCommand);
    });
})