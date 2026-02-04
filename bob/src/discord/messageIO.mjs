import logger from '../utility/logger.mjs';

/**
 * @description Sets up the interaction handler for slash commands.
 * @param {import('discord.js').Client} client - The Discord client.
 */
export const setupInteractionHandler = (client) => {
    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'ping') {
            await interaction.reply('Pong!');
        }
    });
};

/**
 * @description Sets up the message listener for handling message-based events.
 * @param {import('discord.js').Client} client - The Discord client.
 */
export const setupMessageListener = (client) => {
    client.on('messageCreate', message => {
        if (message.author.bot) return;
        
        // Basic message handling could go here
        logger.info(`Received message: ${message.content}`);
    });
};