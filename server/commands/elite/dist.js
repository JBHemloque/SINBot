const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const edsm = require(path.resolve(base.path, 'server/elite/edsm.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dist')
        .setDescription('Gets the distance from one system or commander to another.')
        .addStringOption(option =>
            option
                .setName('from')
                .setDescription('A system or commander')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('to')
                .setDescription('Another system or commander')
                .setRequired(true))
        .addBooleanOption(option => 
            option
                .setName('ephemeral')
                .setDescription('Set to true if only you should see this message'))
        ,
    async execute(interaction) {
        var from = interaction.options.getString('from');
        var to = interaction.options.getString('to');
        var ephemeral = interaction.options.getBoolean('ephemeral');
        edsm.getDistance(from, to).then((dist) => {
            utils.sendText(dist, interaction, ephemeral);
        });
    },
};
