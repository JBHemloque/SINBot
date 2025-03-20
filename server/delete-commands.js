const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('../config.json');

const rest = new REST().setToken(token);

// for global commands
rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
    .then(() => console.log('Successfully deleted all application commands.'))
    .catch(console.error);
