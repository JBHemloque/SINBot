'uses strict';

var ElizaBot = require("./elizabot.js");

var eliza = new ElizaBot("./jaquesdata.js");
console.log(eliza.getInitial());

process.stdin.resume();
process.stdin.setEncoding('utf8');
var util = require('util');

process.stdin.on('data', function(text) {
	text = text.replace(/(\r\n|\n|\r)/gm,"");
	console.log(eliza.transform(text));
    if (eliza.quit) {
        process.exit();
    }
});
