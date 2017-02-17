# SINBot

A chat bot for discord app based off <a href="https://github.com/hydrabolt/discord.js/">discord.js</a>

# Features:
- Newly updated to discord.js version 11, with support for bot accounts and token-based authentication.
- Plugin architecture for easy customization
- Easy to deploy

# Plugins:
- dice - a dice roller, including Fudge dice
- elite - routines useful for explorers in the game Elite Dangerous, including edsm integration and the ability to generate simple galactic maps
- eliza - an elizabot
- jaques - a RiveScript bot for Jaques, cybernetic bartender in the game Elite Dangerous
- randomalias - display random categorized results ("random cat", etc)
- rss - rss feed agent with channel notification ("A new article has appeared")
- search - a custom plugin for the Final Fantasy XIV guild "The Black Coeurl" to enable searching for characters and generating a precis
- trello - trello agent with channel notification ("So-and-so edited the card blah blah")
- wolfram - wolfram alpha integration

# Installation

This bot is written to run on top of node.js version 6. Please see https://nodejs.org/en/download/

Once you have node installed running `npm install` from the bot directory should install all the needed packages. If this command prints errors the bot won't work!

# Running
Before first run you will need to create a `config.js` file. The token for a discord bot account are required. The other credentials are not required for the bot to run, but highly recommended as commands that depend on them will malfunction. See `sample_config.js`.

To start the bot just run
`node server/server.js`.

The bot doesn't include an uncaught exception handler, so I highly recommend running the bot with a process manager like pm2.

# Updates
If you update the bot, please run `npm update` before starting it again. If you have
issues with this, you can try deleting your node_modules folder and then running
`npm install` again. Please see [Installation](#Installation).

This bot includes code from GreenImp's JavaScript RPG dice roller: https://github.com/GreenImp/rpg-dice-roller

# Special configuration

## Special instructions for setting up google search APIs:

(thanks @SchwererKonigstiger)

1) Create a Custom Search at: https://cse.google.com/cse/create/new

2) Leave the first line blank, and name the search engine anything you wish.

3) Click "Advanced Options" and then type ImageObject.

4) Hit create.

5) On this new page, enable the Image Search in the menu.

6) Then press "Search engine ID" under the Details header.

7) Copy this into the auth.json's "google_custom_search" section.

Make sure you also have your google server API key or the search will fail.