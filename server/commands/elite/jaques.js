const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));

import ollama from 'ollama'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jaques')
        .setDescription('Talk to Jaques, your friendly cybernetic bartender.')
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('What do you want to say to him?'))
        .addBooleanOption(option => 
            option
                .setName('ephemeral')
                .setDescription('Set to true if only you should see this message'))
        ,
    async execute(interaction) {
        let text = interaction.options.getString('text');
        let ephemeral = interaction.options.getBoolean('ephemeral');

        const response = await ollama.chat({
          model: 'jaques',
          keep_alive: "24h",
          messages: [{ role: 'user', content: text }],
        })
        console.log(response.message.content)

        await utils.sendText(response.message.content, interaction, ephemeral);
    },
};
