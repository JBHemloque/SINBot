const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const elitelib = require(path.resolve(base.path, 'server/elite/elitelib.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rho')
        .setDescription('Calculates stellar density. run /rhohelp for details.')
        .addBooleanOption(option =>
            option
                .setName('dense')
                .setDescription('Set this to true if there are 50 star systems in the nav panel'))
        .addIntegerOption(option =>
            option
                .setName('distance')
                .setDescription('Distance to the last star in your nav panel list - only valid if `dense` is true'))
        .addIntegerOption(option =>
            option
                .setName('stars')
                .setDescription('Number of stars in your nav panel list - only valid if `dense` is false'))
        ,
    async execute(interaction) {
        if (interaction.options.getBoolean('dense')) {
            let distance = interaction.options.getInteger('distance');
            if (distance) {
                let density = elitelib.calcRho(distance, undefined);
                utils.sendText(`rho = ${density}`, interaction, true);
            } else {
                utils.sendText('You must supply a distance to the last star in your nav list!', interaction, true);
            }
        } else {
            let stars = interaction.options.getInteger('stars');
            if (stars) {
                let density = elitelib.calcRho(undefined, stars);
                utils.sendText(`rho = ${density}`, interaction, true);
            } else {
                utils.sendText('You must supply a count of stars in your nav list!', interaction, true);
            }
        }
    },
};
