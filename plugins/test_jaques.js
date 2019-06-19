'uses strict';

var RiveScript = require("rivescript");
var path = require('path');
var base = require(path.resolve(__dirname, '../base.js'));
var rs_host = require(path.resolve(base.path, 'plugins/rs_host.js'));

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

bot = new rs_host.RSHost(path.resolve(base.path, 'userdata/'));
bot.setup([path.resolve(base.path, 'plugins/rs/jaques'), path.resolve(base.path, 'plugins/rs/base')])
.then(function() {
	console.log("Test environment ready!");
});
