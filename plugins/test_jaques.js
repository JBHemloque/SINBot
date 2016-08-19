'uses strict';

var RiveScript = require("rivescript")

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
    var reply = bot.reply("local-user", line);
    console.log("The bot says: " + reply);
});

var bot = new RiveScript();

// Load a directory full of RiveScript documents (.rive files). This is for
// Node.JS only: it doesn't work on the web!
bot.loadDirectory("./jaques_rs", loading_done, loading_error);

// All file loading operations are asynchronous, so you need handlers
// to catch when they've finished. If you use loadDirectory (or loadFile
// with multiple file names), the success function is called only when ALL
// the files have finished loading.
function loading_done (batch_num) {   
    // Now the replies must be sorted!
    bot.sortReplies();

    console.log("Batch #" + batch_num + " has finished loading!");
}

// It's good to catch errors too!
function loading_error (error) {
    console.log("Error when loading files: " + error);
}