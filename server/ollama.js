'use strict';

var base = require('../base.js');
var path = require('path');
var fs = require("fs");
var utils = require('./utils.js');

const { Ollama} = require('ollama');

const ollama = new Ollama({url:'http://localhost:11434'});

const MAX_HISTORY = 50; // We'll truncte history at 50 items
const DEBUG_HISTORY = true;

function makeHistoryFilepath(user) {
    return path.resolve(base.path, `server/history/${user}.json`);
}

function readJsonFile(filepath) {
    let data = fs.readFileSync(filepath);
    return JSON.parse(data); 
}

function fetchHistory(user) {
    if (user) {
        let filepath = makeHistoryFilepath(user);
        try{
            utils.debugLog(`  - loading ${filepath}`);
            let history = readJsonFile(filepath);
            if (history) {
                return history.history;
            }
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
        fs.writeFile(filepath,JSON.stringify(obj,null,2), function(err) {
            if (err) {
                console.error("Failed to write file", filepath, err);
            }
        });
    }
}

exports.chat = async function(input, user) {
    let history = fetchHistory(user);
    if (DEBUG_HISTORY) {
        console.log(`History for ${user}:`);
        console.log(JSON.stringify(history,null,2));
    }
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
