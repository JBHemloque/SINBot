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

## Special instructions for setting up the Elite plugin. 

The Elite plugin uses ImageMagick to generate the region maps from data dumped from edsm. In order to have accurate maps, you will need to have ImageMagick installed (https://www.imagemagick.org/script/index.php) and a periodic process to grab data from edsm. In addition, the Galactic Mapping Project data should be periodically refreshed in order for it to be up to date.

1) Install ImageMagick from https://www.imagemagick.org/script/index.php and ensure it is on your path. If you fail to do this, you will see errors from the region commands (showloc, region, etc) in the bots error logs.

2) Write a scheduled task to download and refresh the region data. A sample is included in this repo (refreshregions.sh). This script should download https://www.edsm.net/dump/systemsWithCoordinates.json, stop the bot, run plugins/elite/makeregions (to process the system data into a region database), and then restart the bot. The plugin will fall back to a backup region file if it can't find/load the primary file, and the sample script creates this.

3) Write a scheduled task to download and refresh the galactic mapping project data. There is a shell script, plugins/elite/refreshgmp, which does this. This isn't critical, since the GMP data refresh is fast, and it happens automatically when you start the bot, so it will happen as a side effect of the region data refresh.