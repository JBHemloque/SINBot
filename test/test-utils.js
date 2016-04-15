var assert = require('assert');
var utils = require('../utils.js');
var mocks = require('./mocks.js');
var bot = require("../bot.js");

describe('utils', function(){
	it('should export a compileArgs function', function(){
        assert(typeof(utils.compileArgs) == 'function');
    });

    it('should export a bold function', function(){
        assert(typeof(utils.bold) == 'function');
    });

    it('should export an italic function', function(){
        assert(typeof(utils.italic) == 'function');
    });

    it('should export a displayUsage function', function(){
        assert(typeof(utils.displayUsage) == 'function');
    });

    it('should export a inBrief function', function(){
        assert(typeof(utils.inBrief) == 'function');
    });

    it('should export a logError function', function(){
        assert(typeof(utils.logError) == 'function');
    });

    it('should compile args without the first arg', function(){
        var args = ["one", "two", "three", "four"];

        assert(utils.compileArgs(args) === "two three four");
    });

    it('should use ** to bold text', function() {
    	assert(utils.bold("This is a test") === "**This is a test**");
    });

    it('should use * to italicize text', function() {
    	assert(utils.italic("This is a test") === "*This is a test*");
    });

    it('should display usage', function() {
    	var command = {usage: "This is a test"};
    	var handledCommand = false;
    	var client = mocks.makeClient(function(channel, message) {
    		if (message === "Usage: This is a test") {
    			handledCommand = true;
    		}
    	});
    	bot.startBot(client, mocks.makeConfig());
    	utils.displayUsage(client, mocks.makeMessage(""), command);
    	assert(handledCommand);
    });

    it('should display the first sentence inBrief', function() {
    	var res = utils.inBrief("One Two. Three Four.");
    	assert(res === "One Two");
    });

    it('should display the first line inBrief', function() {
    	var res = utils.inBrief("One\nTwo. Three Four.");
    	assert(res === "One");
    });

    it('should close bold markup inBrief', function() {
    	var res = utils.inBrief("**One Two. Three Four.**");
    	assert(res === "**One Two**");
    });

    it('should handle small data sizes in sendMessages', function() {
    	var messageArray = [
    		"One",
    		"Two",
    		"Three"
    	];
    	var expectedResults = "One\nTwo\nThree";
    	var buffer = "";
    	var handledCommand = false;
    	var client = mocks.makeClient(function(channel, message) {
    		if (buffer.length > 0) {
    			buffer += "\n";
    		}
    		buffer += message;
    		if (buffer == expectedResults) {
	    		handledCommand = true;
    		}
    	});
    	bot.startBot(client, mocks.makeConfig());
    	utils.sendMessages(client, mocks.makeMessage("").channel, messageArray);
    	assert(handledCommand);
    });

    it('should handle large data sizes in sendMessages', function() {
    	var messageArray = [
    		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    	];
    	var expectedResults = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    	var buffer = "";
    	var handledCommand = false;
    	var client = mocks.makeClient(function(channel, message, callback) {
    		if (buffer.length > 0) {
    			buffer += "\n";
    		}
    		buffer += message;
    		if (buffer === expectedResults) {
	    		handledCommand = true;
    		}
    		callback();
    	});
    	bot.startBot(client, mocks.makeConfig());
    	utils.sendMessages(client, mocks.makeMessage("").channel, messageArray);
    	assert(handledCommand);
    });

	it('should create the appropriate structures for logError', function() {
		var handledCommand = false;
		utils.logError("Test error", "This is a test error", function(err) {
			handledCommand = true;
			if (typeof(err.timestamp) !== 'string') {
				handledCommand = false;
			}
			if (err.header !== "Test error") {
				handledCommand = false;
			}
			if (err.error !== "This is a test error") {
				handledCommand = false;
			}
		});
		assert(handledCommand);
	});
})