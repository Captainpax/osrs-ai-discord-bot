import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import logger from '../utility/logger.mjs';
import { pushLeaderboard } from '../utility/bobApi.mjs';
import { getClusterHealth } from '../utility/health.mjs';

const STATUS_EMOJI = {
    UP: '✅',
    WARN: '⚠️',
    DOWN: '❌',
    SKIPPED: '⏭️',
    UNKNOWN: '❓'
};

const STATUS_COLOR = {
    UP: 0x2ecc71,
    WARN: 0xf1c40f,
    DOWN: 0xe74c3c,
    SKIPPED: 0x95a5a6,
    UNKNOWN: 0x95a5a6
};

const CHARS_LIMIT = 80;

const formatPercent = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) return 'n/a';
    return `${value?.toFixed ? value.toFixed(2) : value}%`;
};

const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return 'n/a';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let idx = 0;
    let val = bytes;
    while (val >= 1024 && idx < units.length - 1) {
        val /= 1024;
        idx++;
    }
    return `${val.toFixed(1)} ${units[idx]}`;
};

const formatSeconds = (secs = 0) => {
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (parts.length === 0) parts.push(`${Math.floor(secs)}s`);
    return parts.join(' ');
};

const chunkButtons = (buttons, size = 5) => {
    const rows = [];
    for (let i = 0; i < buttons.length; i += size) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + size)));
    }
    return rows;
};

const buildButtons = (services, active) => {
    const buttons = [
        new ButtonBuilder()
            .setCustomId('health_page:summary')
            .setLabel('Summary')
            .setStyle(active === 'summary' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    ];

    services.forEach((svc) => {
        const label = svc.name.length > CHARS_LIMIT ? `${svc.name.slice(0, CHARS_LIMIT - 3)}...` : svc.name;
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`health_page:${svc.name}`)
                .setLabel(label)
                .setStyle(active === svc.name ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );
    });

    return chunkButtons(buttons);
};

const renderSummaryEmbed = (report) => {
    const services = report.services || [];
    const lines = services.map(svc => {
        const latency = svc.latencyMs !== undefined ? ` (${svc.latencyMs}ms)` : '';
        return `${STATUS_EMOJI[svc.status] || '❔'} ${svc.name}${latency}`;
    });

    const load = report.system?.load?.map(l => l.toFixed(2)).join(', ') || 'n/a';
    const mem = report.system?.memory;
    const memText = mem ? `${formatBytes(mem.used)} / ${formatBytes(mem.total)} (${mem.usedPercent}% used)` : 'n/a';

    const gpu = report.gpu;
    let gpuText = 'not detected';
    if (gpu?.available && Array.isArray(gpu.gpus) && gpu.gpus.length) {
        const g0 = gpu.gpus[0];
        gpuText = `${g0.utilizationPercent}% | ${formatBytes(g0.memoryUsed)} / ${formatBytes(g0.memoryTotal)} (${formatPercent(g0.memoryPercent)})`;
    } else if (gpu?.available === false && gpu?.error) {
        gpuText = `unavailable (${gpu.error})`;
    }

    return new EmbedBuilder()
        .setTitle('Health Overview')
        .setColor(STATUS_COLOR[report.status] || 0x3498db)
        .setDescription(lines.join('\n') || 'No service checks were returned.')
        .addFields(
            { name: 'Overall', value: `${STATUS_EMOJI[report.status] || '❔'} ${report.status}`, inline: true },
            { name: 'PST Time', value: report.timePST || 'n/a', inline: true },
            { name: 'Hostname', value: report.hostname || 'n/a', inline: true },
            { name: 'Uptime', value: formatSeconds(report.system?.uptimeSeconds), inline: true },
            { name: 'Load (1/5/15)', value: load, inline: true },
            { name: 'Memory', value: memText, inline: true },
            { name: 'GPU', value: gpuText, inline: true }
        )
        .setFooter({ text: `Updated: ${new Date(report.timestamp || report.system?.timeUTC || Date.now()).toLocaleString()}` });
};

const renderServiceEmbed = (report, serviceName) => {
    const svc = (report.services || []).find(s => s.name === serviceName);
    if (!svc) {
        return new EmbedBuilder()
            .setTitle('Health Detail')
            .setColor(STATUS_COLOR.UNKNOWN)
            .setDescription(`No service named "${serviceName}" found in health report.`);
    }

    const lines = [];
    if (svc.url) lines.push(`URL: ${svc.url}`);
    if (svc.code) lines.push(`Status: ${svc.code}`);
    if (svc.latencyMs !== undefined) lines.push(`Latency: ${svc.latencyMs}ms`);
    if (svc.error) lines.push(`Error: ${svc.error}`);
    if (svc.data && typeof svc.data === 'object') {
        const trimmed = JSON.stringify(svc.data).slice(0, 900);
        lines.push(`Data: ${trimmed}${trimmed.length >= 900 ? '…' : ''}`);
    }

    return new EmbedBuilder()
        .setTitle(`Health • ${serviceName}`)
        .setColor(STATUS_COLOR[svc.status] || 0x3498db)
        .setDescription(lines.join('\n') || 'No details available.')
        .addFields(
            { name: 'Status', value: `${STATUS_EMOJI[svc.status] || '❔'} ${svc.status}`, inline: true },
            { name: 'Latency', value: svc.latencyMs !== undefined ? `${svc.latencyMs}ms` : 'n/a', inline: true },
            { name: 'OK', value: svc.ok ? 'Yes' : 'No', inline: true }
        );
};

/**
 * @description Sets up the interaction handler for slash commands.
 * @param {import('discord.js').Client} client - The Discord client.
 */
export const setupInteractionHandler = (client) => {
    client.on('interactionCreate', async interaction => {
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('health_page:')) {
                const target = interaction.customId.replace('health_page:', '');
                try {
                    const report = await getClusterHealth();
                    const embed = target === 'summary' ? renderSummaryEmbed(report) : renderServiceEmbed(report, target);
                    const components = buildButtons(report.services || [], target);
                    await interaction.update({ embeds: [embed], components });
                } catch (err) {
                    logger.error(`Health button error: ${err.message}`);
                    await interaction.update({ content: 'Failed to refresh health data.', components: [] });
                }
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const sub = interaction.options.getSubcommand(false);
        const commandStr = sub ? `${interaction.commandName} ${sub}` : interaction.commandName;
        logger.debug(`Command "/${commandStr}" run by ${interaction.user.tag} (${interaction.user.id})`);

        try {
            if (interaction.commandName === 'king-ping') {
                await interaction.reply('King Roald says Pong!');
                return;
            }

            if (interaction.commandName === 'admin') {
                const sub = interaction.options.getSubcommand();
                
                if (sub === 'pushleaderboard') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    try {
                        const result = await pushLeaderboard();
                        await interaction.editReply({ content: `✅ ${result.message}` });
                    } catch (err) {
                        logger.error(`Error pushing leaderboard: ${err.message}`);
                        await interaction.editReply({ content: '❌ Failed to push leaderboard. Is Bob awake?' });
                    }
                    return;
                }

                if (sub === 'health') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    try {
                        const report = await getClusterHealth();
                        const embed = renderSummaryEmbed(report);
                        const components = buildButtons(report.services || [], 'summary');
                        await interaction.editReply({ embeds: [embed], components });
                    } catch (err) {
                        logger.error(`Error fetching health: ${err.message}`);
                        await interaction.editReply({ content: '❌ Failed to fetch health status.' });
                    }
                    return;
                }
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
