var assert = require('assert');
var utils = require('../server/utils.js');
var mocks = require('./mocks.js');
var bot = require("../server/bot.js");

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
        var user = mocks.nonAdminUser;
        var sendMessage = function(message, options) {
            if (message.includes("Usage: ")) {
                handledCommand = true;
            } else {
                console.log("Unexpected usage reply: " + message);
            }
        };
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());

        utils.displayUsage(client, mocks.makeMessage("", user, sendMessage), command);
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

    it('should export a sendMessages function', function(){
        assert(typeof(utils.sendMessages) == 'function');
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
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        utils.sendMessages(client, mocks.makeMessage("", function(message) {
            if (buffer.length > 0) {
                buffer += "\n";
            }
            buffer += message;
            if (buffer == expectedResults) {
                handledCommand = true;
            }
        }).channel, messageArray);
        assert(handledCommand);
    });

    it('should handle small data sizes in sendMessage', function() {
        var message = "Lorem ipsum...";
        var expectedResults = "Lorem ipsum...";
        var buffer = "";
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        utils.sendMessage(client, mocks.makeMessage("", function(message) {
            buffer += message;
            if (buffer === expectedResults) {
                handledCommand = true;
            }
        }).channel, message);
        assert(handledCommand);
    });

    it('should handle large data sizes in sendMessage', function() {
        var message =
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n"
            + "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n"
            + "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n"
            + "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n"
            + "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

        var expectedResults = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
        var buffer = "";
        var handledCommand = false;
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        utils.sendMessage(client, mocks.makeMessage("", function(message) {
            if (buffer.length > 0) {
                buffer += "\n";
            }
            buffer += message;
            if (buffer === expectedResults) {
                handledCommand = true;
            }
        }).channel, message, function() {
            assert(handledCommand);
        });
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
        var client = mocks.makeClient();
        bot.startBot(client, mocks.makeConfig());
        utils.sendMessages(client, mocks.makeMessage("", function(message) {
            if (buffer.length > 0) {
                buffer += "\n";
            }
            buffer += message;
            if (buffer === expectedResults) {
                handledCommand = true;
            }
        }).channel, messageArray, false, function() {
            assert(handledCommand);
        });
    });

    it('should export a pmOrSendChannel function', function(){
        assert(typeof(utils.pmOrSendChannel) == 'function');
    });

    it('should export return the main channel for a non-spammy command when pmIfSpam is false', function(){
        var command = {spammy: false}
        var pmChannel = 1;
        var mainChannel = 2;

        assert(utils.pmOrSendChannel(command, false, pmChannel, mainChannel) == mainChannel);
    });

    it('should export return the main channel for a non-spammy command when pmIfSpam is true', function(){
        var command = {spammy: false}
        var pmChannel = 1;
        var mainChannel = 2;

        assert(utils.pmOrSendChannel(command, true, pmChannel, mainChannel) == mainChannel);
    });

    it('should export return the main channel for a spammy command when pmIfSpam is false', function(){
        var command = {spammy: true}
        var pmChannel = 1;
        var mainChannel = 2;

        assert(utils.pmOrSendChannel(command, false, pmChannel, mainChannel) == mainChannel);
    });

    it('should export return the pm channel for a spammy command when pmIfSpam is true', function(){
        var command = {spammy: true}
        var pmChannel = 1;
        var mainChannel = 2;

        assert(utils.pmOrSendChannel(command, true, pmChannel, mainChannel) == pmChannel);
    });

    it('should create the appropriate structures for logError', function() {
        var handledCommand = false;
        var countOutput = 0;
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
        }, function(output) {
            countOutput++;
        });
        assert(countOutput === 3);
        assert(handledCommand);
    });

    it('should export a sanitizeString function', function(){
        assert(typeof(utils.sanitizeString) == 'function');
    });

    it('should sanitize strings appropriately', function() {
        var output = utils.sanitizeString("This is a+'test'");
        assert(output == "This%20is%20a%2B%27test%27");
    });

    it('should export a desanitizeString function', function(){
        assert(typeof(utils.desanitizeString) == 'function');
    });

    it('should desanitize strings appropriately', function() {
        var output = utils.desanitizeString("This%20is%20a%2B%27test%27");
        assert(output == "This is a+'test'");
    });

    it('should exhibit idempotence for sanitization and desanitization', function() {
        var input = "This is a+'test'";
        var expectedOutput = "This%20is%20a%2B%27test%27";

        var temp = utils.sanitizeString(input);
        assert(temp == expectedOutput);
        temp = utils.desanitizeString(temp);
        assert(temp == input);
        temp = utils.sanitizeString(temp);
        assert(temp == expectedOutput);
        temp = utils.desanitizeString(temp);
        assert(temp == input);
        temp = utils.sanitizeString(temp);
        assert(temp == expectedOutput);
        temp = utils.desanitizeString(temp);
        assert(temp == input);
    });
})