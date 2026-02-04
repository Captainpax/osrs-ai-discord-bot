import { Client } from 'discord.js';
import { DISCORD_TOKEN } from '../utility/loadedVariables.mjs';
import logger from '../utility/logger.mjs';

/**
 * @description Creates a new Discord client with the necessary intents.
 * @returns {Client} The initialized Discord client.
 */
export const createClient = () => {
    return new Client({
        intents: [
            'Guilds',
            'GuildMessages',
            'MessageContent', 
        ],
    });
};

/**
 * @description Logs the client into Discord.
 * @param {Client} client - The Discord client to login.
 * @returns {Promise<void>}
 * @throws {Error} If DISCORD_TOKEN is not defined.
 */
export const loginClient = async (client) => {
    if (!DISCORD_TOKEN) {
        throw new Error('DISCORD_TOKEN is not defined in environment variables');
    }
    await client.login(DISCORD_TOKEN);
    logger.info(`Logged in as ${client.user.tag}!`);
};