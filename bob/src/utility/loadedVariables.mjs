import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (two levels up from src/utility)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * @module LoadedVariables
 * @description Centralized environment variables for the project.
 * Uses dotenv to load variables from the .env file.
 */

export const DISCORD_TOKEN = process.env.BOB_DISCORD_TOKEN;
export const DISCORD_CLIENT_ID = process.env.BOB_DISCORD_CLIENT_ID;
export const DISCORD_GUILD_ID = process.env.BOB_DISCORD_GUILD_ID;
export const PORT = process.env.PORT || process.env.BOB_PORT || 3001;
export const DEBUG = process.env.DEBUG === 'true';
export const MONGODB_URI = process.env.MONGODB_URI;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const AI_BASE_URL = process.env.AI_BASE_URL;
export const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
export const OLD_WISE_MAN_URL = process.env.OLD_WISE_MAN_URL || 'http://localhost:8888';
export const BOBS_CHAT = process.env.BOBS_CHAT;
export const BOBS_THOUGHTS = process.env.BOBS_THOUGHTS;
export const BOB_ALLOWED_BOT_IDS = process.env.BOB_ALLOWED_BOT_IDS;
export const LEADERBOARD_CHANNEL = process.env.LEADERBOARD_CHANNEL;
export const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
export const N8N_API_KEY = process.env.N8N_API_KEY;

/**
 * @description Default export containing all environment variables.
 */
export default {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID,
    PORT,
    DEBUG,
    MONGODB_URI,
    OPENAI_API_KEY,
    AI_BASE_URL,
    AI_MODEL,
    OLD_WISE_MAN_URL,
    BOBS_CHAT,
    BOBS_THOUGHTS,
    BOB_ALLOWED_BOT_IDS,
    LEADERBOARD_CHANNEL,
    N8N_WEBHOOK_URL,
    N8N_API_KEY
};
