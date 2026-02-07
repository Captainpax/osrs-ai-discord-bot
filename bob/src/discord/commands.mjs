import { REST, SlashCommandBuilder, Routes } from 'discord.js';
import { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } from '../utility/loadedVariables.mjs';
import logger from '../utility/logger.mjs';

/**
 * @description List of slash commands for the bot.
 * @type {Array<Object>}
 */
export const commands = [
    new SlashCommandBuilder()
        .setName('bob-ping')
        .setDescription('Replies with Bob\'s Pong!'),
    new SlashCommandBuilder()
        .setName('os')
        .setDescription('OSRS player utilities')
        .addSubcommand(sub =>
            sub.setName('link')
               .setDescription('Link your Discord account to an OSRS username')
               .addStringOption(opt => opt.setName('player_name').setDescription('OSRS username').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('unlink')
               .setDescription('Unlink your OSRS username')
        )
        .addSubcommand(sub =>
            sub.setName('stats')
               .setDescription('Show OSRS levels; defaults to you or specify a player/skill')
               .addStringOption(opt => 
                   opt.setName('player_name')
                      .setDescription('OSRS username (optional if you are linked)')
                      .setRequired(false)
               )
               .addStringOption(opt => 
                   opt.setName('skill')
                      .setDescription('Specific skill to look up')
                      .setRequired(false)
                      .addChoices(
                          { name: 'Attack', value: 'attack' },
                          { name: 'Defence', value: 'defence' },
                          { name: 'Strength', value: 'strength' },
                          { name: 'Hitpoints', value: 'hitpoints' },
                          { name: 'Ranged', value: 'ranged' },
                          { name: 'Prayer', value: 'prayer' },
                          { name: 'Magic', value: 'magic' },
                          { name: 'Cooking', value: 'cooking' },
                          { name: 'Woodcutting', value: 'woodcutting' },
                          { name: 'Fletching', value: 'fletching' },
                          { name: 'Fishing', value: 'fishing' },
                          { name: 'Firemaking', value: 'firemaking' },
                          { name: 'Crafting', value: 'crafting' },
                          { name: 'Smithing', value: 'smithing' },
                          { name: 'Mining', value: 'mining' },
                          { name: 'Herblore', value: 'herblore' },
                          { name: 'Agility', value: 'agility' },
                          { name: 'Thieving', value: 'thieving' },
                          { name: 'Slayer', value: 'slayer' },
                          { name: 'Farming', value: 'farming' },
                          { name: 'Runecraft', value: 'runecraft' },
                          { name: 'Hunter', value: 'hunter' },
                          { name: 'Construction', value: 'construction' }
                      )
               )
        )
        .addSubcommand(sub =>
            sub.setName('pricelookup')
               .setDescription('Look up the current G.E. price of an item')
               .addStringOption(opt => opt.setName('item').setDescription('Item name').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('questlookup')
               .setDescription('Look up OSRS quest info and wiki link')
               .addStringOption(opt => opt.setName('quest_name').setDescription('Name of the quest').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('bosslookup')
               .setDescription('Look up OSRS boss info and your kill count')
               .addStringOption(opt => opt.setName('boss_name').setDescription('Name of the boss').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('bosspetget')
               .setDescription('Check pet drop rate for a boss')
               .addStringOption(opt => opt.setName('boss_name').setDescription('Name of the boss').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('wikilookup')
               .setDescription('Search the OSRS Wiki')
               .addStringOption(opt => opt.setName('query').setDescription('Search term').setRequired(true))
        )
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