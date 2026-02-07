import { REST, SlashCommandBuilder, Routes } from 'discord.js';
import { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } from '../utility/loadedVariables.mjs';
import logger from '../utility/logger.mjs';

/**
 * @description List of slash commands for the bot.
 * @type {Array<Object>}
 */
export const commands = [
    new SlashCommandBuilder()
        .setName('king-ping')
        .setDescription('Replies with King Roald\'s Pong!'),
    new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands')
        .addSubcommand(sub =>
            sub.setName('pushleaderboard')
               .setDescription('Tells Bob to push the leaderboard now')
        ),
].map(command => command.toJSON());

/**
 * @description Registers slash commands with Discord.
 * If DISCORD_GUILD_ID is provided, it registers commands for that specific guild (instant update).
 * Otherwise, it registers commands globally (can take up to an hour).
 * @returns {Promise<void>}
 * @throws {Error} If DISCORD_TOKEN or DISCORD_CLIENT_ID is not defined.
 */
export const registerCommands = async () => {
    if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
        throw new Error('DISCORD_TOKEN or DISCORD_CLIENT_ID is not defined');
    }

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        logger.info('Started refreshing application (/) commands.');

        if (DISCORD_GUILD_ID) {
            // Clear global commands to ensure no "ghost" commands from previous global registrations
            logger.info('Clearing global commands...');
            await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: [] });

            await rest.put(
                Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
                { body: commands },
            );
            logger.info(`Successfully reloaded application (/) commands for guild ${DISCORD_GUILD_ID}.`);
        } else {
            await rest.put(
                Routes.applicationCommands(DISCORD_CLIENT_ID),
                { body: commands },
            );
            logger.info('Successfully reloaded application (/) commands globally.');
        }
    } catch (error) {
        logger.error(`Error registering commands: ${error.message}`);
    }
};