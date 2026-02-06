import { MessageFlags } from 'discord.js';
import logger from '../utility/logger.mjs';
import { ensureProfileAndToken, linkOsrsName, unlinkOsrsName, getStats, priceLookup, getQuest, getBoss, getBossStats, getBossPet } from '../utility/wiseApi.mjs';

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
                const sub = interaction.options.getSubcommand();
                const discordId = interaction.user.id;
                const username = interaction.user.username;

                // Ensure profile & token
                const { profile, token } = await ensureProfileAndToken(discordId, username);

                if (sub === 'link') {
                    const playerName = interaction.options.getString('player_name', true);
                    await linkOsrsName(token, playerName, profile.uuid);
                    await interaction.reply(`Linked your profile to OSRS account: ${playerName}`);
                    return;
                }

                if (sub === 'unlink') {
                    await unlinkOsrsName(token, profile.uuid);
                    await interaction.reply('Your OSRS account has been unlinked.');
                    return;
                }

                if (sub === 'stats') {
                    const skill = interaction.options.getString('skill', false) || undefined;
                    const playerName = interaction.options.getString('player_name', false);
                    const identifier = playerName || discordId;

                    try {
                        const data = await getStats(identifier, skill);
                        if (skill) {
                            const capitalizedSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
                            await interaction.reply(`**${data.osrsName}**'s ${capitalizedSkill} level: **${data.level}** (XP: ${data.xp?.toLocaleString() || 'N/A'}, Rank: ${data.rank?.toLocaleString() || 'N/A'})`);
                        } else {
                            const total = data.totalLevel || data.skills?.overall?.level || 'N/A';
                            const totalXp = data.totalXP || data.skills?.overall?.xp;
                            const xpStr = totalXp ? ` (Total XP: ${totalXp.toLocaleString()})` : '';
                            await interaction.reply(`**${data.osrsName}**'s Total Level: **${total}**${xpStr}`);
                        }
                    } catch (err) {
                        if (err.response?.status === 404) {
                            await interaction.reply({ content: `Could not find OSRS stats for "${identifier}". ${!playerName ? "Have you linked your account with `/os link`?" : ""}`, flags: [MessageFlags.Ephemeral] });
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
                        await interaction.reply(`${result.item.name} (GE): High ${result.price.high} / Low ${result.price.low} ${result.cached ? `(cached as of ${updated})` : ''}`);
                    } else {
                        await interaction.reply(`Could not find price for "${item}"`);
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

                        await interaction.reply({
                            content: `### ${result.title}\n${extract}\n\n**Wiki Link:** ${result.url}${cacheStr}`
                        });
                    } else {
                        await interaction.reply(`Could not find quest "${questName}"`);
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
                            const hiscoreKey = result.title
                                .toLowerCase()
                                .replace(/[^a-z0-9 ]/g, '')
                                .split(' ')
                                .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
                                .join('');
                            
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
                            logger.debug(`Could not fetch KC for boss "${bossName}" (key: ${result.title}): ${err.message}`);
                        }

                        await interaction.reply({
                            content: `### ${result.title}\n${extract}\n\n**Wiki Link:** ${result.url}${kcStr}${chanceStr}${cacheStr}`
                        });
                    } else {
                        await interaction.reply(`Could not find boss "${bossName}"`);
                    }
                    return;
                }

                if (sub === 'bosspetget') {
                    const bossName = interaction.options.getString('boss_name', true);
                    try {
                        const result = await getBossPet(bossName);
                        const { boss, pet } = result;
                        
                        await interaction.reply({
                            content: `### ${boss} Pet Info\n**Pet:** ${pet.name}\n**Drop Rate:** 1/${pet.chance.toLocaleString()}\n\n*Use \`/os bosslookup\` to see your personal chance!*`
                        });
                    } catch (err) {
                        if (err.response?.status === 404) {
                            await interaction.reply(`Could not find pet information for "${bossName}".`);
                        } else {
                            throw err;
                        }
                    }
                    return;
                }
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
            logger.error(`Command error: ${errorMsg}`);
            if (err.response?.data) {
                logger.debug(`Error response body: ${JSON.stringify(err.response.data)}`);
            }
            logger.debug(err.stack);
            try {
                await interaction.reply({ content: `Sorry, something went wrong: ${errorMsg}`, flags: [MessageFlags.Ephemeral] });
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