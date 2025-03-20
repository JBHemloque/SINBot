'use strict';

var base = require('../base.js');
var path = require('path');
var fs = require("fs");
var utils = require('./utils.js');
var config = require('../config.json');

const { Ollama} = require('ollama');

let ollamaConfig = config.ollama;

const ollama = new Ollama({url:ollamaConfig.addr});

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
    if (ollamaConfig.includeIntroduction) {
        history = [makeIntroduction(user)];
    }
    return history;
}

function saveHistory(user, history) {
    if (user) {
        // Remove from the head until history.length <= ollamaConfig.maxHistory
        let truncated = false;
        while(history.length >= ollamaConfig.maxHistory) {
            history.splice(0, 1);
            truncated = true;
        }
        if (truncated && ollamaConfig.includeIntroduction) {
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
    if (ollamaConfig.debugHistory) {
        console.log(`History for ${user}`);
        console.log(JSON.stringify(history,null,2));
    }
    let response = await ollama.chat({
          model: ollamaConfig.model,
          messages: history,
        });
    history.push(response.message);
    saveHistory(user, history);
    return response.message.cont
}
