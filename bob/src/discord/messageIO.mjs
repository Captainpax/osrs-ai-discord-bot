import { MessageFlags, EmbedBuilder } from 'discord.js';
import logger from '../utility/logger.mjs';
import { ensureProfileAndToken, linkOsrsName, unlinkOsrsName, getStats, priceLookup, getQuest, getBoss, getBossStats, getBossPet } from '../utility/wiseApi.mjs';

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
            if (interaction.commandName === 'bob-ping') {
                await interaction.reply('Bob says Pong!');
                return;
            }

            if (interaction.commandName === 'os') {
                await interaction.deferReply();
                await interaction.editReply(`⏳ **Please wait...**\n*Waiting for OSRS API (Rate limits may apply)*\nStarted: <t:${Math.floor(Date.now() / 1000)}:R>`);
                
                const sub = interaction.options.getSubcommand();
                const discordId = interaction.user.id;
                const username = interaction.user.username;

                // Ensure profile & token
                const { profile, token } = await ensureProfileAndToken(discordId, username);

                if (sub === 'link') {
                    const playerName = interaction.options.getString('player_name', true);
                    await linkOsrsName(token, playerName, profile.uuid);
                    await interaction.editReply(`Linked your profile to OSRS account: ${playerName}`);
                    return;
                }

                if (sub === 'unlink') {
                    await unlinkOsrsName(token, profile.uuid);
                    await interaction.editReply('Your OSRS account has been unlinked.');
                    return;
                }

                if (sub === 'stats') {
                    const skill = interaction.options.getString('skill', false) || undefined;
                    const playerName = interaction.options.getString('player_name', false);
                    const identifier = playerName || discordId;

                    try {
                        const data = await getStats(identifier, skill);
                        const embed = new EmbedBuilder()
                            .setColor(0x0099FF)
                            .setTimestamp(data.updatedAt ? new Date(data.updatedAt) : new Date());

                        if (skill) {
                            const capitalizedSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
                            const emoji = SKILL_EMOJIS[skill.toLowerCase()] || '';
                            
                            embed.setTitle(`${emoji} ${capitalizedSkill} Stats for ${data.osrsName}`)
                                 .setURL(`https://services.runescape.com/m=hiscore_oldschool/hiscorepersonal.ws?user1=${encodeURIComponent(data.osrsName)}`)
                                 .addFields(
                                     { name: 'Level', value: `**${data.level}**`, inline: true },
                                     { name: 'XP', value: `**${data.xp?.toLocaleString() || 'N/A'}**`, inline: true },
                                     { name: 'Rank', value: `**${data.rank?.toLocaleString() || 'N/A'}**`, inline: true }
                                 );
                        } else {
                            const totalLevel = data.totalLevel || data.skills?.overall?.level || 'N/A';
                            const totalXp = data.totalXP || data.skills?.overall?.xp || 0;
                            const combatLevel = data.combatLevel || 'N/A';

                            embed.setTitle(`📊 OSRS Stats for ${data.osrsName}`)
                                 .setURL(`https://services.runescape.com/m=hiscore_oldschool/hiscorepersonal.ws?user1=${encodeURIComponent(data.osrsName)}`)
                                 .setDescription(`**Combat Level: ${combatLevel}**\n**Total Level: ${totalLevel}**\n**Total XP: ${totalXp.toLocaleString()}**`);

                            const skills = data.skills;
                            if (skills) {
                                const skillLayout = [
                                    ['attack', 'strength', 'defence', 'ranged', 'prayer', 'magic', 'runecraft', 'construction'],
                                    ['hitpoints', 'agility', 'herblore', 'thieving', 'crafting', 'fletching', 'slayer', 'hunter'],
                                    ['mining', 'smithing', 'fishing', 'cooking', 'firemaking', 'woodcutting', 'farming', 'overall']
                                ];

                                skillLayout.forEach(col => {
                                    let text = '';
                                    col.forEach(s => {
                                        const val = skills[s];
                                        const emoji = SKILL_EMOJIS[s] || '';
                                        const level = val?.level ?? (s === 'overall' ? totalLevel : '1');
                                        text += `${emoji} **${level}**\n`;
                                    });
                                    embed.addFields({ name: '\u200B', value: text, inline: true });
                                });

                                // Add Legend
                                const legend = Object.entries(SKILL_EMOJIS)
                                    .filter(([name]) => name !== 'overall')
                                    .map(([name, emoji]) => `${emoji} ${name.charAt(0).toUpperCase() + name.slice(1)}`)
                                    .join(' • ');
                                embed.addFields({ name: 'Emoji Legend', value: legend });
                            }
                        }

                        if (data.cached) {
                            embed.setFooter({ text: 'Data is cached' });
                        }

                        await interaction.editReply({ content: '', embeds: [embed] });
                    } catch (err) {
                        if (err.response?.status === 404) {
                            await interaction.editReply({ content: `Could not find OSRS stats for "${identifier}". ${!playerName ? "Have you linked your account with `/os link`?" : ""}` });
                        } else {
                            throw err;
                        }
                    }
                    return;
                }

                if (sub === 'pricelookup') {
                    const item = interaction.options.getString('item', true);
                    const result = await priceLookup(item);
                    if (result?.item && result?.price) {
                        const updated = new Date(result.updatedAt).toLocaleString();
                        await interaction.editReply(`${result.item.name} (GE): High ${result.price.high} / Low ${result.price.low} ${result.cached ? `(cached as of ${updated})` : ''}`);
                    } else {
                        await interaction.editReply(`Could not find price for "${item}"`);
                    }
                    return;
                }

                if (sub === 'quest') {
                    const questName = interaction.options.getString('quest_name', true);
                    const result = await getQuest(questName);
                    
                    if (result?.title) {
                        const updated = new Date(result.updatedAt).toLocaleString();
                        const cacheStr = result.cached ? `\n*(cached as of ${updated})*` : '';
                        
                        // Limit extract length for Discord (2000 chars limit for whole message)
                        let extract = result.extract || 'No information available.';
                        if (extract.length > 500) {
                            extract = extract.substring(0, 500) + '...';
                        }

                        await interaction.editReply({
                            content: `### ${result.title}\n${extract}\n\n**Wiki Link:** <${result.url}>${cacheStr}`
                        });
                    } else {
                        await interaction.editReply(`Could not find quest "${questName}"`);
                    }
                    return;
                }

                if (sub === 'bosslookup') {
                    const bossName = interaction.options.getString('boss_name', true);
                    const result = await getBoss(bossName);
                    
                    if (result?.title) {
                        const updated = new Date(result.updatedAt).toLocaleString();
                        const cacheStr = result.cached ? `\n*(cached as of ${updated})*` : '';
                        
                        let extract = result.extract || 'No information available.';
                        if (extract.length > 500) {
                            extract = extract.substring(0, 500) + '...';
                        }

                        // Try to get KC if user is linked
                        let kcStr = '';
                        let chanceStr = '';
                        try {
                            let hiscoreKey = result.title
                                .replace(/-/g, ' ')
                                .toLowerCase()
                                .replace(/[^a-z0-9 ]/g, '')
                                .split(' ')
                                .map((word, index) => {
                                    if (word === 'tzkal') return 'tzKal';
                                    if (word === 'tztok') return 'tzTok';
                                    if (word === 'of' && index > 0) return 'of';
                                    if (index === 0) return word;
                                    return word.charAt(0).toUpperCase() + word.slice(1);
                                })
                                .join('');
                            
                            if (hiscoreKey === 'theNightmare') hiscoreKey = 'nightmare';
                            
                            const stats = await getBossStats(discordId, hiscoreKey);
                            if (stats && stats.score !== undefined) {
                                kcStr = `\n**Your Kill Count:** ${stats.score.toLocaleString()}`;
                                
                                // Calculate pet chance if pet info is present
                                if (result.pet && result.pet.chance) {
                                    const kc = stats.score;
                                    const chance = 1 / result.pet.chance;
                                    const probability = (1 - Math.pow(1 - chance, kc)) * 100;
                                    const timesDropRate = (kc / result.pet.chance).toFixed(2);
                                    
                                    chanceStr = `\n**Pet Chance:** ${probability.toFixed(2)}% (${timesDropRate}x the drop rate)`;
                                }
                            }
                        } catch (err) {
                            if (err.response?.status === 404) {
                                logger.debug(`Boss "${bossName}" (key: ${hiscoreKey}) is unranked for user ${discordId}`);
                            } else {
                                logger.debug(`Could not fetch KC for boss "${bossName}" (key: ${hiscoreKey}): ${err.message}`);
                            }
                        }

                        await interaction.editReply({
                            content: `### ${result.title}\n${extract}\n\n**Wiki Link:** <${result.url}>${kcStr}${chanceStr}${cacheStr}`
                        });
                    } else {
                        await interaction.editReply(`Could not find boss "${bossName}"`);
                    }
                    return;
                }

                if (sub === 'bosspetget') {
                    const bossName = interaction.options.getString('boss_name', true);
                    try {
                        const result = await getBossPet(bossName);
                        const { boss, pet } = result;
                        
                        await interaction.editReply({
                            content: `### ${boss} Pet Info\n**Pet:** ${pet.name}\n**Drop Rate:** 1/${pet.chance.toLocaleString()}\n\n*Use \`/os bosslookup\` to see your personal chance!*`
                        });
                    } catch (err) {
                        if (err.response?.status === 404) {
                            await interaction.editReply(`Could not find pet information for "${bossName}".`);
                        } else {
                            throw err;
                        }
                    }
                    return;
                }
            }
        } catch (err) {
            const status = err.response?.status;
            const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
            
            logger.error(`Command error: ${errorMsg}`);
            if (err.response?.data) {
                logger.debug(`Error response body: ${JSON.stringify(err.response.data)}`);
            }
            logger.debug(err.stack);

            let responseContent = `Sorry, something went wrong: ${errorMsg}`;
            if (status === 429) {
                responseContent = `❌ **Rate limited by OSRS API**\nPlease wait a moment before trying again. <t:${Math.floor(Date.now() / 1000)}:R>`;
            }

            try {
                await interaction.editReply({ content: responseContent });
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