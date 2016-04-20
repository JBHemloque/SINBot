'use strict';

const NAME = "Public Name of your Bot";

const LOGIN = "LOGIN_HERE";
const PASSWORD = "PASSWORD_HERE";

const COMMAND_PREFIX = "!_"

const PLUGINS = [
	{
		name: "Trello",
		path: "./plugins/trello.js",
		config: {
			key: "TRELLO_KEY",
			token: "TRELLO_TOKEN",
			boards: [
				{
					id:'BOARD_ID',
					channel:'#operations'
				},
				{
					id:'BOARD_ID',
					channel:'#operations'
				}
			]
		}
	},
	{
		name: "Search",
		path: "./plugins/search.js",
		config: {
			apikey: "GOOGLE_CUSTOM_SEARCH_API_KEY",
			lodestone_cx: "LODESTONE_CUSTOM_SEARCH_CX",
			lodestone_server: "LODESTONE_SERVER_YOURE_ON",
			wiki_cx: "RPC_WIKI_CUSTOM_SEARCH_CX"
		}
	},
	{
		name: "Dice",
		path: "./plugins/dice.js"
	},
	{
		name: "Eliza",
		path: "./plugins/eliza.js"
	},
	{
		name: "Simple Commands",
		path: "./plugins/simple.js"
	},
	{
		name: "Elite",
		path: "./plugins/elite.js",
		config: {
			regionfont: "ArialBk"
		}
	}
];

const ADMIN_IDS = ["LIST", "OF", "BOT", "ADMINS", "BY", "DISCORD", "USER_ID"];

module.exports.NAME = NAME;
module.exports.LOGIN = LOGIN;
module.exports.PASSWORD = PASSWORD;
module.exports.COMMAND_PREFIX = COMMAND_PREFIX;
module.exports.PLUGINS = PLUGINS;
module.exports.ADMIN_IDS = ADMIN_IDS;