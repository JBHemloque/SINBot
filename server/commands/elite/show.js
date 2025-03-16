const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));
const elite = require(path.resolve(base.path, 'server/elite/elite.js'));
const elitelib = require(path.resolve(base.path, 'server/elite/elitelib.js'));
const edsm = require(path.resolve(base.path, 'server/elite/edsm.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('show')
        .setDescription('Shows a system in the galaxy.')
        .addStringOption(option => 
            option
                .setName('system')
                .setDescription("Name of the system we want to see")
                .setRequired(true))
        .addBooleanOption(option => 
            option
                .setName('ephemeral')
                .setDescription('Set to true if only you should see this message'))
        ,
    async execute(interaction) {
        var name = interaction.options.getString('system');
        var ephemeral = interaction.options.getBoolean('ephemeral')
        await utils.deferAttachment(interaction, ephemeral);
        elite.getNormalizedRegionMap(name, function(data) {
            if (data) {
                if (data.attachment) {
                    utils.attachFile(data.attachment, interaction);
                }
            } else {
                utils.sendDeferredText(`No map data exists for ${name} yet...`, interaction);
            }
        });
    },
};
