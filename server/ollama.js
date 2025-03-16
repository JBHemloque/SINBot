'use strict';

const { Ollama} = require('ollama');

const ollama = new Ollama({url:'http://localhost:11434'});

exports.chat = async function(input) {
    return await ollama.chat({
          model: 'jaques',
          keep_alive: "24h",
          messages: [{ role: 'user', content: input }],
        });
}
