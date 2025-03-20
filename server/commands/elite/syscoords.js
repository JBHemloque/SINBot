const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const edsm = require(path.resolve(base.path, 'server/elite/edsm.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('syscoords')
        .setDescription('Gets the galactic coordinates of a system.')
        .addStringOption(option =>
            option
                .setName('system')
                .setDescription("Name of the system we're looking up")
                .setRequired(true))
        .addBooleanOption(option => 
            option
                .setName('ephemeral')
                .setDescription('Set to true if only you should see this message'))
        ,
    async execute(interaction) {
        var system = interaction.options.getString('system');
        var ephemeral = interaction.options.getBoolean('ephemeral');
        edsm.getSystemCoords(system).then((message) => {
            utils.sendText(message, interaction, ephemeral);
        });
    }
};