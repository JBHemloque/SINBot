const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));
const elite = require(path.resolve(base.path, 'server/elite/elite.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register your EDSM name as a default for commands that use it')
        .addStringOption(option => 
            option
                .setName('edsm_name')
                .setDescription('Your CMDRs name on EDSM')
                .setRequired(true))
        ,
    async execute(interaction) {
        var edsmName = interaction.options.getString('edsm_name');
        var authorId = elite.getAuthorId(interaction);
        if (edsmName) {
            utils.sendText(elite.setEdsmName(authorId, edsmName), interaction, true);
        }
    },
};
