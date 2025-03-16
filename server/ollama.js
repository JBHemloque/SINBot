'use strict';

var base = require('../base.js');
var path = require('path');
var fs = require("fs");
var utils = require('./utils.js');

const { Ollama} = require('ollama');

const ollama = new Ollama({url:'http://localhost:11434'});

const MAX_HISTORY = 50; // We'll truncte history at 50 items

function removeItem(array, itemToRemove) {
    const index = array.indexOf(itemToRemove);

    if (index !== -1) {
        array.splice(index, 1);
    }

    console.log("Updated Array: ", array);
}

function makeHistoryFilepath(user) {
    return path.resolve(base.path, `history/${user}.json`);
}

function fetchHistory(user) {
    if (user) {
        let filepath = makeHistoryFilepath(user);
        try{
            utils.debugLog(`  - loading ${filepath}`);
            let history = require(filepath);
            return history.history;
        } catch(e) {
            // No history, no-op
        }
    }
    return [];
}

function saveHistory(user, history) {
    if (user) {
        // Remove from the head until history.length <= MAX_HISTORY
        while(history.length > MAX_HISTORY) {
            history.splice(0, 1);
        }
        let filepath = makeHistoryFilepath(user);
        let obj = {
            history: history
        };
        fs.writeFile(filepath,JSON.stringify(messagebox,null,2), function(err) {
            if (err) {
                console.error("Failed to write file", filename, err);
            }
        });
    }
}

exports.chat = async function(input, user) {
    let history = fetchHistory(user);
    history.push({
        role: 'user',
        content: input
    });
    let response = await ollama.chat({
          model: 'jaques',
          keep_alive: "24h",
          messages: history,
        });
    history.push(response.message);
    saveHistory(user, history);
    return response.message.content;
}
