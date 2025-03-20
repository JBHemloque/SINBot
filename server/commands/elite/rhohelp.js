const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rhohelp')
        .setDescription('How to use the rho command to calculate stellar density'),
    async execute(interaction) {
        let data = fs.readFileSync(path.join(__dirname, 'rhohelp.md'), 'utf8');
        await utils.sendText(data, interaction, true);
    },
};
