const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));
const elite = require(path.resolve(base.path, 'server/elite/elite.js'));
const elitelib = require(path.resolve(base.path, 'server/elite/elitelib.js'));
const edsm = require(path.resolve(base.path, 'server/elite/edsm.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whereis')
        .setDescription('Shows the location of a commander.')
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
        var ephemeral = interaction.options.getBoolean('ephemeral')
        if (!name) {
            name = elite.getCmdrName(interaction);
        }
        await utils.deferAttachment(interaction, ephemeral);
        edsm.getPositionString(name, function(posStringObj, position) {
            if (position) {
                console.log('Got position: ' + JSON.stringify(position));
                elite.getRegionMap(position, function(data) {
                    if (data) {
                        if (data.attachment) {
                            utils.attachFile(data.attachment, interaction);
                        }
                    } else {
                        utils.sendDeferredText(`No map data exists for ${position} yet...`, interaction);
                    }
                    utils.sendDeferredText(posStringObj.message, interaction);
                });
            } else {
                console.log('No position data');
                if (posStringObj.commanderExists) {
                    // EDSM doesn't have position info on them
                    utils.sendDeferredText(posStringObj.message, interaction);
                } else {
                    console.log('Todo: showRegion');
                    // @@ Todo: showRegion
                }
            }
        });
    },
};
