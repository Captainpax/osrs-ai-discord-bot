import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const {
    KING_ROALD_DISCORD_TOKEN,
    BOBS_CHAT,
    BOB_DISCORD_CLIENT_ID
} = process.env;

if (!KING_ROALD_DISCORD_TOKEN) {
    throw new Error('KING_ROALD_DISCORD_TOKEN is required in .env');
}

if (!BOBS_CHAT) {
    throw new Error('BOBS_CHAT is required in .env');
}

if (!BOB_DISCORD_CLIENT_ID) {
    throw new Error('BOB_DISCORD_CLIENT_ID is required in .env to identify Bob responses');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PROMPT = process.env.TEST_PROMPT || 'how are you doing bob?';
const TIMEOUT_MS = 90_000;

const waitForBobReply = async (channel, promptMessage) => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Timed out waiting for Bob response.'));
        }, TIMEOUT_MS);

        let statusMessageId;

        const cleanup = () => {
            clearTimeout(timeout);
            client.off('messageCreate', onMessageCreate);
            client.off('messageUpdate', onMessageUpdate);
        };

        const isFromBob = (msg) => msg?.author?.id === BOB_DISCORD_CLIENT_ID;
        const isSameChannel = (msg) => msg?.channelId === channel.id;
        const isReplyToPrompt = (msg) => msg?.reference?.messageId === promptMessage.id;

        const onMessageCreate = (msg) => {
            if (!isFromBob(msg) || !isSameChannel(msg)) return;
            if (!isReplyToPrompt(msg)) return;

            statusMessageId = msg.id;
            if (msg.content && !msg.content.toLowerCase().includes('thinking')) {
                cleanup();
                resolve(msg.content);
            }
        };

        const onMessageUpdate = (_, newMsg) => {
            if (!isFromBob(newMsg) || !isSameChannel(newMsg)) return;
            if (statusMessageId && newMsg.id !== statusMessageId) return;
            if (!newMsg.content) return;
            cleanup();
            resolve(newMsg.content);
        };

        client.on('messageCreate', onMessageCreate);
        client.on('messageUpdate', onMessageUpdate);
    });
};

client.once('clientReady', async () => {
    try {
        const channel = await client.channels.fetch(BOBS_CHAT);
        if (!channel || !channel.isTextBased()) {
            throw new Error(`Channel ${BOBS_CHAT} not found or not text-based.`);
        }

        console.log(`Sending prompt to #${channel.name} (${channel.id}) as King Roald...`);
        const promptMessage = await channel.send(PROMPT);
        console.log(`Prompt sent: ${promptMessage.id}`);

        const response = await waitForBobReply(channel, promptMessage);
        console.log('Bob response received:\n', response);
    } catch (err) {
        console.error('Test failed:', err.message);
        process.exitCode = 1;
    } finally {
        client.destroy();
    }
});

client.login(KING_ROALD_DISCORD_TOKEN);
