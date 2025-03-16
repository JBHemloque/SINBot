'use strict';

const NAME = "Public Name of your Bot";

const TOKEN = "TOKEN HERE";

const COMMAND_PREFIX = "!_"

const PLUGINS = [
	{
		name: "RSS",
		path: "../plugins/rss.js",
		config: {
			feeds: [
				{
					url:'FEED_URL',
					channel:'#news'
				},
				{
					url:'FEED_URL',
					channel:'#news'
				}
			]
		}
	},
	{
		name: "Dice",
		path: "../plugins/dice.js"
	},
	{
		name: "Eliza",
		path: "../plugins/eliza.js"
	},
	{
		name: "Simple Commands",
		path: "../plugins/simple.js"
	},
	{
		name: "Elite",
		path: "../plugins/elite.js",
		config: {
			regionfont: "ArialBk"
		}
	}
];

const ADMIN_IDS = ["LIST", "OF", "BOT", "ADMINS", "BY", "DISCORD", "USER_ID"];

module.exports.NAME = NAME;
module.exports.TOKEN = TOKEN;
module.exports.COMMAND_PREFIX = COMMAND_PREFIX;
module.exports.PLUGINS = PLUGINS;
module.exports.ADMIN_IDS = ADMIN_IDS;