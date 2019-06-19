'uses strict';

var RiveScript = require("rivescript");
var rs_host = require("./rs_host.js");

var prompt = "You: ";

var lineReader = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});
lineReader.setPrompt(prompt);

lineReader.on('line', function(line) {
    if (line === 'quit' || line === 'exit') {
        process.exit(0);
    }
    bot.reply(line, "local-user", 666)
    .then(function(reply) {
    	console.log(JSON.stringify(reply));
	    console.log("The bot says: " + bot.stripGarbage(reply));
    });    
});

bot = new rs_host.RSHost('../userdata');
bot.setup(['./rs/jaques', './rs/base'], function() {
    console.log("Ready!");
});
