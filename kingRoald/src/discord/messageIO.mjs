import { MessageFlags } from 'discord.js';
import logger from '../utility/logger.mjs';

/**
 * @description Sets up the interaction handler for slash commands.
 * @param {import('discord.js').Client} client - The Discord client.
 */
export const setupInteractionHandler = (client) => {
    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        const sub = interaction.options.getSubcommand(false);
        const commandStr = sub ? `${interaction.commandName} ${sub}` : interaction.commandName;
        logger.debug(`Command "/${commandStr}" run by ${interaction.user.tag} (${interaction.user.id})`);

        try {
            if (interaction.commandName === 'king-ping') {
                await interaction.reply('King Roald says Pong!');
                return;
            }
        } catch (err) {
            logger.error(`Command error: ${err.message}`);
            logger.debug(err.stack);
            try {
                await interaction.reply({ content: 'King Roald is displeased... something went wrong processing your command.', flags: [MessageFlags.Ephemeral] });
            } catch (_) {
                // ignore
            }
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