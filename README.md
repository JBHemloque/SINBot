# SINBot

A chat bot for discord app based off <a href="https://github.com/hydrabolt/discord.js/">discord.js</a>

# Features:
- Newly updated to discord.js version 14, with support for bot accounts and token-based authentication.

# Installation

This bot is written to run on top of node.js version 22. Please see https://nodejs.org/en/download/

Once you have node installed running `npm install` from the bot directory should install all the needed packages. If this command prints errors the bot won't work!

# Running
Before first run you will need to create a `config.json` file. The token for a discord bot account are required. The other credentials are not required for the bot to run, but highly recommended as commands that depend on them will malfunction. See `sample_config.json`.

To start the bot just run
`node server/server.js`.

The bot doesn't include an uncaught exception handler, so I highly recommend running the bot with a process manager like pm2.

# Updates
If you update the bot, please run `npm update` before starting it again. If you have
issues with this, you can try deleting your node_modules folder and then running
`npm install` again. Please see [Installation](#Installation).
