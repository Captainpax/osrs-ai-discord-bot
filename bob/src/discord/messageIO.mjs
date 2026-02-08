import crypto from 'crypto';
import { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import logger from '../utility/logger.mjs';
import { BOBS_CHAT, BOBS_THOUGHTS, BOB_ALLOWED_BOT_IDS } from '../utility/loadedVariables.mjs';
import { ensureProfileAndToken, linkOsrsName, unlinkOsrsName, getStats, priceLookup, searchQuests, getBoss, searchBosses, getBossStats, getBossPet, searchWiki, getWikiPage } from '../utility/wiseApi.mjs';
import { askN8N } from '../ai/n8n/index.mjs';

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

const SKILL_LAYOUT = [
    ['attack', 'strength', 'defence', 'ranged', 'prayer', 'magic', 'runecraft', 'construction'],
    ['hitpoints', 'agility', 'herblore', 'thieving', 'crafting', 'fletching', 'slayer', 'hunter'],
    ['mining', 'smithing', 'fishing', 'cooking', 'firemaking', 'woodcutting', 'farming', 'overall']
];

const ALLOWED_BOT_IDS = new Set(
    (BOB_ALLOWED_BOT_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
);

const SESSION_TTL_MS = 15 * 60 * 1000;
const SESSION_CLEANUP_MS = 5 * 60 * 1000;
const n8nSessions = new Map();

const registerSession = (sessionId, data) => {
    n8nSessions.set(sessionId, { ...data, createdAt: Date.now() });
};

const getSession = (sessionId) => n8nSessions.get(sessionId);

const clearSession = (sessionId) => {
    n8nSessions.delete(sessionId);
};

const cleanupSessions = () => {
    const now = Date.now();
    for (const [sessionId, data] of n8nSessions.entries()) {
        if (now - data.createdAt > SESSION_TTL_MS) {
            n8nSessions.delete(sessionId);
        }
    }
};

const cleanupInterval = setInterval(cleanupSessions, SESSION_CLEANUP_MS);
if (cleanupInterval.unref) cleanupInterval.unref();

const truncate = (text, max = 900) => {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const buildThoughtEmbed = (title, fields = [], color = 0x5865F2) => {
    const embed = new EmbedBuilder().setTitle(title).setColor(color).setTimestamp(new Date());
    if (fields.length) embed.addFields(fields);
    return embed;
};

const sendThought = async (client, payload) => {
    if (!BOBS_THOUGHTS) return;
    try {
        const channel = await client.channels.fetch(BOBS_THOUGHTS);
        if (!channel || !channel.isTextBased()) return;
        await channel.send(payload);
    } catch (err) {
        logger.debug(`Failed to send thought log: ${err.message}`);
    }
};

/**
 * @description Renders the stats embed.
 */
function renderStatsEmbed(data) {
    const totalLevel = data.totalLevel || data.skills?.overall?.level || 'N/A';
    const totalXp = data.totalXP || data.skills?.overall?.xp || 0;
    const combatLevel = data.combatLevel || 'N/A';

    const embed = new EmbedBuilder()
        .setTitle(`📊 OSRS Stats for ${data.osrsName}`)
        .setURL(`https://services.runescape.com/m=hiscore_oldschool/hiscorepersonal.ws?user1=${encodeURIComponent(data.osrsName)}`)
        .setDescription(`**Combat Level: ${combatLevel}**\n**Total Level: ${totalLevel}**\n**Total XP: ${totalXp.toLocaleString()}**`)
        .setColor(0x0099FF)
        .setTimestamp(data.updatedAt ? new Date(data.updatedAt) : new Date());

    const skills = data.skills;
    if (skills) {
        SKILL_LAYOUT.forEach(col => {
            let text = '';
            col.forEach(s => {
                const val = skills[s];
                const emoji = SKILL_EMOJIS[s] || '';
                const level = val?.level ?? (s === 'overall' ? totalLevel : '1');
                text += `${emoji} **${level}**\n`;
            });
            embed.addFields({ name: '\u200B', value: text, inline: true });
        });
    }

    if (data.cached) {
        embed.setFooter({ text: 'Data is cached' });
    }

    return embed;
}

/**
 * @description Renders the legend embed.
 */
function renderLegendEmbed(data) {
    const embed = new EmbedBuilder()
        .setTitle(`📖 Emoji Legend for ${data.osrsName}`)
        .setColor(0x0099FF)
        .setTimestamp(data.updatedAt ? new Date(data.updatedAt) : new Date());

    SKILL_LAYOUT.forEach(col => {
        let text = '';
        col.forEach(s => {
            const emoji = SKILL_EMOJIS[s] || '';
            const name = s.charAt(0).toUpperCase() + s.slice(1);
            text += `${emoji} ${name}\n`;
        });
        embed.addFields({ name: '\u200B', value: text, inline: true });
    });

    if (data.cached) {
        embed.setFooter({ text: 'Data is cached' });
    }

    return embed;
}

/**
 * @description Creates the action row for stats pagination.
 */
function createStatsButtons(identifier, currentPage) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`stats_page:stats:${identifier}`)
            .setLabel('Stats')
            .setStyle(currentPage === 'stats' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(currentPage === 'stats'),
        new ButtonBuilder()
            .setCustomId(`stats_page:legend:${identifier}`)
            .setLabel('Legend')
            .setStyle(currentPage === 'legend' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(currentPage === 'legend')
    );
}

/**
 * @description Renders a wiki page embed (works for general wiki, quests, and bosses).
 */
async function renderWikiPageEmbed(result, discordId) {
    const updated = new Date(result.updatedAt).toLocaleString();
    const cacheStr = result.cached ? `\n*(cached as of ${updated})*` : '';
    
    let extract = result.extract || 'No information available.';
    if (extract.length > 1500) {
        extract = extract.substring(0, 1500) + '...';
    }

    const embed = new EmbedBuilder()
        .setTitle(result.title)
        .setURL(result.url)
        .setDescription(extract + cacheStr)
        .setColor(0x0099FF)
        .setTimestamp(new Date(result.updatedAt));

    // Handle Quest Details
    if (result.questDetails) {
        const qd = result.questDetails;
        const fields = [];
        if (qd.start) fields.push({ name: 'Start point', value: qd.start });
        if (qd.difficulty) fields.push({ name: 'Official difficulty', value: qd.difficulty, inline: true });
        if (qd.length) fields.push({ name: 'Official length', value: qd.length, inline: true });
        if (qd.requirements) {
            let reqs = qd.requirements;
            if (reqs.length > 1024) reqs = reqs.substring(0, 1021) + '...';
            fields.push({ name: 'Requirements', value: reqs });
        }
        if (qd.items) {
            let items = qd.items;
            if (items.length > 1024) items = items.substring(0, 1021) + '...';
            fields.push({ name: 'Items required', value: items });
        }
        if (qd.recommended) {
            let rec = qd.recommended;
            if (rec.length > 1024) rec = rec.substring(0, 1021) + '...';
            fields.push({ name: 'Recommended', value: rec });
        }
        if (qd.kills) {
            let kills = qd.kills;
            if (kills.length > 1024) kills = kills.substring(0, 1021) + '...';
            fields.push({ name: 'Enemies to defeat', value: kills });
        }

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        if (qd.description) {
            embed.setDescription(qd.description + cacheStr);
        }
    }

    // Handle Boss Details (Location and Drops)
    if (result.bossDetails) {
        const bd = result.bossDetails;
        if (bd.location) {
            embed.addFields({ name: 'Location', value: bd.location });
        }
        if (bd.drops) {
            embed.addFields({ name: 'Notable Drops', value: bd.drops });
        }
    }

    // Handle Pet Info (Basic rate)
    if (result.pet && result.pet.chance) {
        embed.addFields({ 
            name: 'Pet Info', 
            value: `**${result.pet.name}**\nDrop Rate: **1/${result.pet.chance.toLocaleString()}**`,
            inline: true 
        });
    }

    // Handle Personal Boss Stats (KC and Probability)
    if (discordId) {
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
                embed.addFields({ name: 'Your Kill Count', value: `**${stats.score.toLocaleString()}**`, inline: true });
                
                if (result.pet && result.pet.chance) {
                    const kc = stats.score;
                    const chance = 1 / result.pet.chance;
                    const probability = (1 - Math.pow(1 - chance, kc)) * 100;
                    const timesDropRate = (kc / result.pet.chance).toFixed(2);
                    
                    embed.addFields({ 
                        name: 'Your Pet Chance', 
                        value: `**${probability.toFixed(2)}%** (${timesDropRate}x rate)`,
                        inline: true 
                    });
                }
            }
        } catch (err) {
            // Ignore errors for unranked/linked bosses
            logger.debug(`Could not fetch KC for boss "${result.title}": ${err.message}`);
        }
    }

    if (result.image) {
        embed.setImage(result.image);
    }
    
    if (result.cached) {
        embed.setFooter({ text: 'Data from cache' });
    }

    return embed;
}

/**
 * @description Sets up the interaction handler for slash commands.
 * @param {import('discord.js').Client} client - The Discord client.
 */
export const setupInteractionHandler = (client) => {
    client.on('interactionCreate', async interaction => {
        // Restriction: Bob's commands and buttons only in BOBS_CHAT
        if (BOBS_CHAT && interaction.channelId !== BOBS_CHAT) {
            const isBobCommand = interaction.isChatInputCommand() && 
                (interaction.commandName === 'bob-ping' || interaction.commandName === 'os');
            
            const isBobButton = interaction.isButton() && (
                interaction.customId.startsWith('stats_page:') || 
                interaction.customId.startsWith('wiki_lookup:') || 
                interaction.customId.startsWith('quest_lookup:') ||
                interaction.customId.startsWith('boss_lookup:')
            );

            if (isBobCommand || isBobButton) {
                await interaction.reply({ 
                    content: `Please use my commands in <#${BOBS_CHAT}>!`, 
                    flags: MessageFlags.Ephemeral 
                });

                try {
                    const bobsChannel = await client.channels.fetch(BOBS_CHAT);
                    if (bobsChannel && bobsChannel.isTextBased()) {
                        await bobsChannel.send(`Hey <@${interaction.user.id}>, try your command here again!`);
                    }
                } catch (err) {
                    logger.error(`Failed to send redirection message to BOBS_CHAT: ${err.message}`);
                }
                return;
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId.startsWith('stats_page:')) {
                try {
                    const [, page, identifier] = interaction.customId.split(':');
                    const data = await getStats(identifier);
                    
                    if (data) {
                        const embed = page === 'legend' ? renderLegendEmbed(data) : renderStatsEmbed(data);
                        const row = createStatsButtons(identifier, page);
                        await interaction.update({ embeds: [embed], components: [row] });
                    }
                } catch (err) {
                    logger.error(`Error in stats button interaction: ${err.message}`);
                }
                return;
            }

            if (interaction.customId.startsWith('wiki_lookup:') || interaction.customId.startsWith('quest_lookup:') || interaction.customId.startsWith('boss_lookup:')) {
                try {
                    await interaction.deferReply();
                    const title = interaction.customId.split(':').slice(1).join(':');
                    
                    let result;
                    if (interaction.customId.startsWith('boss_lookup:')) {
                        result = await getBoss(title);
                    } else {
                        result = await getWikiPage(title);
                    }
                    
                    if (result?.title) {
                        const embed = await renderWikiPageEmbed(result, interaction.user.id);
                        await interaction.editReply({ content: '', embeds: [embed] });
                    } else {
                        await interaction.editReply(`Could not find wiki page for "${title}"`);
                    }
                } catch (err) {
                    logger.error(`Error in button interaction: ${err.message}`);
                    const response = { content: 'Sorry, something went wrong while fetching the page.' };
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply(response);
                    } else {
                        await interaction.reply({ ...response, flags: MessageFlags.Ephemeral });
                    }
                }
                return;
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        /**
         * @description Helper to handle command errors consistently.
         */
        const handleCommandError = async (cmdInteraction, err, custom404Msg) => {
            const status = err.response?.status;
            const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
            logger.error(`Command error: ${errorMsg}`);

            if (status === 404 && custom404Msg) {
                await cmdInteraction.editReply({ content: custom404Msg });
            } else {
                let responseContent = `Sorry, something went wrong: ${errorMsg}`;
                if (status === 429) {
                    responseContent = `❌ **Rate limited by OSRS API**\nPlease wait a moment before trying again. <t:${Math.floor(Date.now() / 1000)}:R>`;
                }
                try {
                    await cmdInteraction.editReply({ content: responseContent });
                } catch (_) { /* ignore */ }
            }
        };

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

                        let embeds;
                        let components = [];

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
                            
                            if (data.cached) {
                                embed.setFooter({ text: 'Data is cached' });
                            }
                            embeds = [embed];
                        } else {
                            embeds = [renderStatsEmbed(data)];
                            components = [createStatsButtons(identifier, 'stats')];
                        }

                        await interaction.editReply({ content: '', embeds, components });
                    } catch (err) {
                        await handleCommandError(interaction, err, `Could not find OSRS stats for "${identifier}". ${!playerName ? "Have you linked your account with \`/os link\`?" : ""}`);
                        return;
                    }
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

                if (sub === 'questlookup') {
                    const questName = interaction.options.getString('quest_name', true);
                    try {
                        const { results } = await searchQuests(questName);
                        
                        if (results && results.length > 0) {
                            const topMatches = results.slice(0, 4);
                            const embed = new EmbedBuilder()
                                .setTitle(`Quest Search results for "${questName}"`)
                                .setColor(0x0099FF)
                                .setDescription(topMatches.map((r, i) => `${i + 1}. **${r.title}**`).join('\n'))
                                .setFooter({ text: 'Click a button below for quest details' });
                            
                            if (topMatches[0].image) {
                                embed.setThumbnail(topMatches[0].image);
                            }

                            const row = new ActionRowBuilder();
                            topMatches.forEach((r) => {
                                const safeTitle = r.title.length > 80 ? r.title.substring(0, 80) : r.title;
                                row.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`quest_lookup:${safeTitle}`)
                                        .setLabel(r.title.length > 80 ? r.title.substring(0, 77) + '...' : r.title)
                                        .setStyle(ButtonStyle.Primary)
                                );
                            });

                            await interaction.editReply({
                                content: '',
                                embeds: [embed],
                                components: [row]
                            });
                        } else {
                            await interaction.editReply(`No quests found matching "${questName}"`);
                        }
                    } catch (err) {
                        await handleCommandError(interaction, err, `No quests found matching "${questName}"`);
                        return;
                    }
                }

                if (sub === 'bosslookup') {
                    const bossName = interaction.options.getString('boss_name', true);
                    try {
                        const { results } = await searchBosses(bossName);
                        
                        if (results && results.length > 0) {
                            const topMatches = results.slice(0, 4);
                            const embed = new EmbedBuilder()
                                .setTitle(`Boss Search results for "${bossName}"`)
                                .setColor(0x0099FF)
                                .setDescription(topMatches.map((r, i) => `${i + 1}. **${r.title}**`).join('\n'))
                                .setFooter({ text: 'Click a button below for boss details' });
                            
                            if (topMatches[0].image) {
                                embed.setThumbnail(topMatches[0].image);
                            }

                            const row = new ActionRowBuilder();
                            topMatches.forEach((r) => {
                                const safeTitle = r.title.length > 80 ? r.title.substring(0, 80) : r.title;
                                row.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`boss_lookup:${safeTitle}`)
                                        .setLabel(r.title.length > 80 ? r.title.substring(0, 77) + '...' : r.title)
                                        .setStyle(ButtonStyle.Primary)
                                );
                            });

                            await interaction.editReply({
                                content: '',
                                embeds: [embed],
                                components: [row]
                            });
                        } else {
                            await interaction.editReply(`No bosses found matching "${bossName}"`);
                        }
                    } catch (err) {
                        await handleCommandError(interaction, err, `No bosses found matching "${bossName}"`);
                        return;
                    }
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
                        await handleCommandError(interaction, err, `Could not find pet information for "${bossName}".`);
                        return;
                    }
                }

                if (sub === 'wikilookup') {
                    const query = interaction.options.getString('query', true);
                    try {
                        const { results } = await searchWiki(query);
                        
                        if (results && results.length > 0) {
                            const topMatches = results.slice(0, 4);
                            const embed = new EmbedBuilder()
                                .setTitle(`Wiki Search results for "${query}"`)
                                .setColor(0x0099FF)
                                .setDescription(topMatches.map((r, i) => `${i + 1}. **${r.title}**`).join('\n'))
                                .setFooter({ text: 'Click a button below for more details' });
                            
                            if (topMatches[0].image) {
                                embed.setThumbnail(topMatches[0].image);
                            }

                            const row = new ActionRowBuilder();
                            topMatches.forEach((r) => {
                                const safeTitle = r.title.length > 80 ? r.title.substring(0, 80) : r.title;
                                row.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`wiki_lookup:${safeTitle}`)
                                        .setLabel(r.title.length > 80 ? r.title.substring(0, 77) + '...' : r.title)
                                        .setStyle(ButtonStyle.Primary)
                                );
                            });

                            await interaction.editReply({
                                content: '',
                                embeds: [embed],
                                components: [row]
                            });
                        } else {
                            await interaction.editReply(`No wiki results found for "${query}"`);
                        }
                    } catch (err) {
                        await handleCommandError(interaction, err, `No wiki results found for "${query}"`);
                    }
                }
            }
        } catch (err) {
            await handleCommandError(interaction, err);
        }
    });
};

/**
 * @description Sets up the message listener for handling message-based events.
 * Listens for "bob", @bob, or replies in the configured chat channel to trigger n8n.
 * @param {import('discord.js').Client} client - The Discord client.
 */
export const setupMessageListener = (client) => {
    client.on('messageCreate', async message => {
        // Ignore bot messages unless explicitly allowed
        if (message.author.bot && !ALLOWED_BOT_IDS.has(message.author.id)) return;

        // Only listen in BOBS_CHAT if configured
        if (BOBS_CHAT && message.channelId === BOBS_CHAT) {
            const content = message.content.toLowerCase();
            const isMentioned = message.mentions.has(client.user);
            const containsBob = content.includes('bob');
            const isReplyToBob = message.mentions.repliedUser?.id === client.user.id;

            // Trigger criteria: contains "bob", mentions bot, or is a reply to Bob
            if (containsBob || isMentioned || isReplyToBob) {
                logger.info(`N8N Triggered by ${message.author.tag}: ${message.content}`);
                const sessionId = crypto.randomUUID();
                
                // Show typing indicator
                try {
                    await message.channel.sendTyping();
                } catch (err) {
                    logger.error(`Error sending typing indicator: ${err.message}`);
                }

                // Send initial "thinking" message
                let statusMessage;
                try {
                    statusMessage = await message.reply("⏳ **Bob is thinking...**");
                } catch (err) {
                    logger.error(`Error sending status message: ${err.message}`);
                }

                // Prepare payload for n8n
                const payload = {
                    prompt: message.content,
                    user: message.author.username,
                    userId: message.author.id,
                    sessionId,
                    channelId: message.channelId,
                    thoughtsChannelId: BOBS_THOUGHTS,
                    messageId: message.id,
                    statusMessageId: statusMessage?.id,
                    timestamp: message.createdAt
                };

                registerSession(sessionId, {
                    channelId: message.channelId,
                    statusMessageId: statusMessage?.id,
                    userId: message.author.id,
                    userTag: message.author.tag,
                    prompt: message.content
                });

                await sendThought(client, {
                    embeds: [
                        buildThoughtEmbed('Bob -> n8n', [
                            { name: 'Session', value: sessionId },
                            { name: 'User', value: `${message.author.tag} (${message.author.id})` },
                            { name: 'Source Channel', value: message.channelId },
                            { name: 'Prompt', value: truncate(message.content, 700) }
                        ])
                    ]
                });

                // Send to n8n
                const response = await askN8N(payload);

                await sendThought(client, {
                    embeds: [
                        buildThoughtEmbed('n8n Webhook Response', [
                            { name: 'Session', value: sessionId },
                            { name: 'Status', value: response.ok ? `OK (${response.status || 'n/a'})` : `ERROR (${response.status || 'n/a'})` },
                            { name: 'Body', value: truncate(JSON.stringify(response.data || response.error || 'no body'), 900) }
                        ], response.ok ? 0x2ecc71 : 0xe74c3c)
                    ]
                });

                // If askN8N returns null, it means the request itself failed
                if (!response.ok) {
                    let errorMsg = "❌ **Bob is currently busy or having trouble thinking. Please try again in a bit.**";
                    if (response.status === 404) {
                        errorMsg = "⚠️ **Bob's brain link is offline.** The n8n workflow isn't active yet. Please try again shortly.";
                    } else if (response.status === 401 || response.status === 403) {
                        errorMsg = "⚠️ **Bob's brain link is unauthorized.** The n8n API key may be invalid.";
                    }
                    if (statusMessage) {
                        try {
                            await statusMessage.edit(errorMsg);
                        } catch (err) {
                            logger.error(`Error editing status message with error: ${err.message}`);
                        }
                    } else {
                        try {
                            await message.reply(errorMsg);
                        } catch (err) {
                            logger.error(`Error sending error reply: ${err.message}`);
                        }
                    }
                    logger.warn('No response received from n8n or an error occurred.');
                    clearSession(sessionId);
                }
                // Note: The actual AI response will be handled via the REST API callback
            }
        }
        
        logger.debug(`Received message: ${message.content} from ${message.author.tag}`);
    });
};

/**
 * @description Handles the AI response callback from n8n.
 * @param {import('discord.js').Client} client - The Discord client.
 * @param {string} sessionId - The session ID for the request.
 * @param {object} data - The response data from n8n.
 */
export async function handleAiResponse(client, sessionId, data) {
    const { response, error } = data || {};
    const session = sessionId ? getSession(sessionId) : null;
    const targetChannelId = session?.channelId;
    const targetStatusMessageId = session?.statusMessageId;

    logger.debug(`Handling AI response callback (session ${sessionId || 'n/a'}): ${JSON.stringify(data)}`);

    await sendThought(client, {
        embeds: [
            buildThoughtEmbed('n8n Callback', [
                { name: 'Session', value: sessionId || 'n/a' },
                { name: 'Known Session', value: session ? 'yes' : 'no' },
                { name: 'Error', value: error ? truncate(String(error), 700) : 'none' },
                { name: 'Response', value: response ? truncate(String(response), 700) : 'none' }
            ], error ? 0xe74c3c : 0x3498db)
        ]
    });

    if (!session || !targetChannelId) {
        logger.error(`No session found for AI response (session ${sessionId || 'n/a'}).`);
        return;
    }

    try {
        const channel = await client.channels.fetch(targetChannelId);
        if (!channel || !channel.isTextBased()) {
            logger.error(`Could not find channel ${targetChannelId} for AI response.`);
            return;
        }

        let statusMessage;
        if (targetStatusMessageId) {
            try {
                statusMessage = await channel.messages.fetch(targetStatusMessageId);
            } catch (err) {
                logger.debug(`Could not find status message ${targetStatusMessageId}: ${err.message}`);
            }
        }

        if (error) {
            const errorMsg = `❌ **Error from AI:** ${error}`;
            if (statusMessage) {
                await statusMessage.edit(errorMsg);
            } else {
                await channel.send(errorMsg);
            }
            clearSession(sessionId);
            return;
        }

        if (response) {
            const reply = response.length > 2000 ? response.substring(0, 1997) + '...' : response;
            if (statusMessage) {
                await statusMessage.edit(reply);
            } else {
                await channel.send(reply);
            }
            clearSession(sessionId);
        } else {
            const warnMsg = "⚠️ **Bob had a blank thought. Please try again.**";
            if (statusMessage) {
                await statusMessage.edit(warnMsg);
            } else {
                await channel.send(warnMsg);
            }
            clearSession(sessionId);
        }
    } catch (err) {
        logger.error(`Error in handleAiResponse: ${err.message}`);
    }
}
