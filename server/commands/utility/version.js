const { SlashCommandBuilder } = require('discord.js');
const package = require('../../../package.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('version')
        .setDescription('Displays the version of the bot'),
    async execute(interaction) {
        await interaction.reply(`SinBot version ${package.version}`);
    },
};
