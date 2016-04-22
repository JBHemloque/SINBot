var assert = require('assert');
var bot = require("../bot.js");
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
	var handledCommand = false;
	var client = mocks.makeClient(function(channel, message) {
		if (message.includes("Usage: ")) {
	    	handledCommand = true;
	    } else {
	    	console.log("Unexpected usage reply: " + message);
	    }
	});
	bot.startBot(client, mocks.makeConfig([{ name: "Elite", path: "./plugins/elite.js" }]));
	bot.procCommand(client, mocks.makeMessage(command, user));
	return handledCommand;
}

function handleAdminCheck(command) {
	var handledCommand = false;
	var client = mocks.makeClient(function(channel, message) {
		if (message.includes("you are not allowed to do that")) {
    		handledCommand = true;
		}
	});
	bot.startBot(client, mocks.makeConfig());
	bot.procCommand(client, mocks.makeMessage(command, mocks.nonAdminUser));
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

    it("should calculate a route properly", function() {
        var handledCommand = false;
        var client = mocks.makeClient(function(channel, message) {
            if (message == "Estimated plot range should be around **968.30ly** - check range *962.97 to 973.63 ly*") {
                handledCommand = true;
            }
        });
        createBot(client, bot);
        bot.procCommand(client, mocks.makeMessage("!route 33.06 8"));
        assert(handledCommand);
    });

    it("should calculate a route properly with a max distance", function() {
        var handledCommand = false;
        var client = mocks.makeClient(function(channel, message) {
            if (message == "Estimated plot range should be around **976.41ly** - check range *971.04 to 981.78 ly*") {
                handledCommand = true;
            }
        });
        createBot(client, bot);
        bot.procCommand(client, mocks.makeMessage("!route 34.54 9 980"));
        assert(handledCommand);
    });
})