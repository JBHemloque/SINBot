const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const base = require(path.resolve(__dirname, '../../../base.js'));
const utils = require(path.resolve(base.path, 'server/utils.js'));
const ollama = require(path.resolve(base.path, 'server/ollama.js'));

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

        await utils.deferAttachment(interaction, ephemeral);

	console.log(JSON.stringify(ollama));
        const response = await ollama.chat({
          model: 'jaques',
          keep_alive: "24h",
          messages: [{ role: 'user', content: text }],
        })
        console.log(response.message.content)

        await utils.sendDeferredText(response.message.content, interaction, ephemeral);
    },
};
