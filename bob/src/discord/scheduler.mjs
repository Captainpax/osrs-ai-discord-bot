import { EmbedBuilder } from 'discord.js';
import { checkLevelUps, getLeaderboard } from '../utility/wiseApi.mjs';
import { BOBS_CHAT, LEADERBOARD_CHANNEL } from '../utility/loadedVariables.mjs';
import logger from '../utility/logger.mjs';

const SKILL_EMOJIS = {
    attack: '⚔️',
    strength: '💪',
    defence: '🛡️',
    ranged: '🏹',
    prayer: '✨',
    magic: '🧙',
    runecraft: '💠',
    construction: '🏗️',
    hitpoints: '❤️',
    agility: '🏃',
    herblore: '🧪',
    thieving: '👥',
    crafting: '🔨',
    fletching: '🎯',
    slayer: '💀',
    hunter: '🐾',
    mining: '⛏️',
    smithing: '⚒️',
    fishing: '🎣',
    cooking: '🍳',
    firemaking: '🔥',
    woodcutting: '🪵',
    farming: '🌱',
    overall: '🏆'
};

/**
 * @description Runs the level-up check and sends announcements.
 * @param {import('discord.js').Client} client 
 */
export async function runLevelUpCheck(client) {
    if (!BOBS_CHAT) {
        logger.debug('BOBS_CHAT not configured, skipping level-up check');
        return;
    }
    
    try {
        logger.info('Running scheduled level-up check...');
        const levelUps = await checkLevelUps();
        if (!levelUps || levelUps.length === 0) {
            logger.debug('No level-ups detected.');
            return;
        }
        
        const channel = await client.channels.fetch(BOBS_CHAT);
        if (!channel) {
            logger.error(`Could not find channel with ID ${BOBS_CHAT}`);
            return;
        }

        for (const lu of levelUps) {
            const embed = new EmbedBuilder()
                .setTitle(`🚀 Level Up!`)
                .setDescription(`**${lu.osrsName}** has reached new heights!`)
                .setColor(0x00FF00)
                .setTimestamp();
            
            let fieldText = '';
            for (const diff of lu.diffs) {
                const emoji = SKILL_EMOJIS[diff.skill] || '';
                const skillName = diff.skill.charAt(0).toUpperCase() + diff.skill.slice(1);
                fieldText += `${emoji} **${skillName}**: ${diff.oldLevel} ➡️ **${diff.newLevel}**\n`;
            }
            
            embed.addFields({ name: 'Skills', value: fieldText });
            
            const content = lu.discordId ? `<@${lu.discordId}>` : '';
            await channel.send({ content, embeds: [embed] });
        }
        logger.info(`Announced ${levelUps.length} player level-ups.`);
    } catch (err) {
        logger.error(`Error in runLevelUpCheck: ${err.message}`);
    }
}

/**
 * @description Runs the leaderboard update.
 * @param {import('discord.js').Client} client 
 */
export async function runLeaderboardUpdate(client) {
    if (!LEADERBOARD_CHANNEL) {
        logger.debug('LEADERBOARD_CHANNEL not configured, skipping leaderboard update');
        return;
    }
    
    try {
        logger.info('Running scheduled leaderboard update...');
        const response = await getLeaderboard();
        const { leaderboard, highestGainer } = response || {};
        
        if (!leaderboard || leaderboard.length === 0) {
            logger.debug('No leaderboard data available.');
            return;
        }
        
        const channel = await client.channels.fetch(LEADERBOARD_CHANNEL);
        if (!channel) {
            logger.error(`Could not find channel with ID ${LEADERBOARD_CHANNEL}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏆 Top Levels Leaderboard`)
            .setColor(0xFFD700)
            .setTimestamp()
            .setFooter({ text: 'Updated every 6 hours' });

        let description = '';
        leaderboard.forEach((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            description += `${medal} **${entry.osrsName}** - Total: **${entry.totalLevel}** (${entry.totalXP.toLocaleString()} XP)\n`;
        });
        
        embed.setDescription(description || 'No linked players yet.');

        if (highestGainer && highestGainer.gains > 0) {
            const mention = highestGainer.discordId ? `<@${highestGainer.discordId}>` : `**${highestGainer.osrsName}**`;
            embed.addFields({
                name: '🔥 Weekly MVP',
                value: `${mention} has gained **${highestGainer.gains}** levels this week! ⚡`
            });
        }
        
        await channel.send({ embeds: [embed] });
        logger.info('Leaderboard updated successfully.');
    } catch (err) {
        logger.error(`Error in runLeaderboardUpdate: ${err.message}`);
    }
}

let lastLevelUpRun = 0;
let lastLeaderboardRun = 0;

/**
 * @description Initializes the scheduler for Bob's periodic tasks.
 * @param {import('discord.js').Client} client 
 */
export function initScheduler(client) {
    logger.info('Scheduler initialized.');
    
    // Check every 10 seconds for alignment
    setInterval(() => {
        const now = Date.now();
        const date = new Date(now);
        const mins = date.getMinutes();
        const hours = date.getHours();
        
        // Level up check: every 30 mins (on the hour and half-hour)
        if (mins === 0 || mins === 30) {
            const periodStart = Math.floor(now / (30 * 60 * 1000)) * (30 * 60 * 1000);
            if (lastLevelUpRun < periodStart) {
                lastLevelUpRun = periodStart;
                runLevelUpCheck(client);
            }
        }
        
        // Leaderboard: every 6 hours (0, 6, 12, 18)
        if (hours % 6 === 0 && mins === 0) {
            const periodStart = Math.floor(now / (6 * 60 * 60 * 1000)) * (6 * 60 * 60 * 1000);
            if (lastLeaderboardRun < periodStart) {
                lastLeaderboardRun = periodStart;
                runLeaderboardUpdate(client);
            }
        }
    }, 10000);
}
