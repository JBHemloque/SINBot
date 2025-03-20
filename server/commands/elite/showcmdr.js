const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));
const elite = require(path.resolve(base.path, 'server/elite/elite.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('showcmdr')
        .setDescription('Show your EDSM name, if registered'),
    async execute(interaction) {
        var edsmName = elite.getEdsmName(interaction);
         if (edsmName) {
            utils.sendText(`You are registered with the EDSM name ${edsmName}`, interaction, true);
        } else {
            utils.sendText("You have not registered an EDSM name with the 'register' command", interaction, true);
        }
    },
};
