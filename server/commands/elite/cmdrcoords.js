const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const edsm = require(path.resolve(base.path, 'server/elite/edsm.js'));
const elite = require(path.resolve(base.path, 'server/elite/elite.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cmdrcoords')
        .setDescription('Gets the location of a commander, including system coordinates, if they are available.')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription("Name of the commander we're looking up (or yourself, if blank)"))
        .addBooleanOption(option => 
            option
                .setName('ephemeral')
                .setDescription('Set to true if only you should see this message'))
        ,
    async execute(interaction) {
        var name = interaction.options.getString('name');
        var ephemeral = interaction.options.getBoolean('ephemeral');
        if (!name) {
            name = elite.getCmdrName(interaction);
        }
        edsm.getCmdrCoords(name).then((message) => {
            utils.sendText(message, interaction, ephemeral);
        });
    }
};
