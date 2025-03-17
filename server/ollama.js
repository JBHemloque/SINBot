'use strict';

var base = require('../base.js');
var path = require('path');
var fs = require("fs");
var utils = require('./utils.js');

const { Ollama} = require('ollama');

const ollama = new Ollama({url:'http://localhost:11434'});

const MAX_HISTORY = 5; // We'll truncte history at 5 items
const DEBUG_HISTORY = true;
const INCLUDE_INTRODUCTION = true;

function makeHistoryFilepath(user) {
    return path.resolve(base.path, `server/history/${user}.json`);
}

function makeIntroduction(user) {
    return {
        role: 'user',
        content: 'Your name is Jaques. My name is ' + user
    }
}

function fetchHistory(user) {
    if (user) {
        let filepath = makeHistoryFilepath(user);
        try{
            let data = fs.readFileSync(filepath);
            let history = JSON.parse(data);
            if (history) {
                return history.history;
            }
        } catch(e) {
            console.log(e);
            // No history, no-op
        }
    }
    let history =[];
    if (INCLUDE_INTRODUCTION) {
        history = [makeIntroduction(user)];
    }
    return history;
}

function saveHistory(user, history) {
    if (user) {
        // Remove from the head until history.length <= MAX_HISTORY
        let truncated = false;
        while(history.length >= MAX_HISTORY) {
            history.splice(0, 1);
            truncated = true;
        }
        if (truncated && INCLUDE_INTRODUCTION) {
             history.unshift(makeIntroduction(user));
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
    history.push({
        role: 'user',
        content: input
    });
    if (DEBUG_HISTORY) {
        console.log(`History for ${user}`);
        console.log(JSON.stringify(history,null,2));
    }
    let response = await ollama.chat({
          model: 'jaques',
          messages: history,
        });
    history.push(response.message);
    saveHistory(user, history);
    return response.message.content;
}
