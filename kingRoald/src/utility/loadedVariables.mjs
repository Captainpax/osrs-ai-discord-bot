import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (three levels up from src/utility)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * @module LoadedVariables
 * @description Centralized environment variables for the project.
 */

export const PORT = process.env.PORT || process.env.KING_ROALD_PORT || 3002;
export const DEBUG = process.env.DEBUG === 'true';
export const MONGODB_URI = process.env.MONGODB_URI;
export const DISCORD_TOKEN = process.env.KING_ROALD_DISCORD_TOKEN;
export const DISCORD_CLIENT_ID = process.env.KING_ROALD_DISCORD_CLIENT_ID;
export const DISCORD_GUILD_ID = process.env.KING_ROALD_DISCORD_GUILD_ID;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const AI_BASE_URL = process.env.AI_BASE_URL;
export const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
export const OLD_WISE_MAN_URL = process.env.OLD_WISE_MAN_URL || 'http://localhost:8888';

export default {
    PORT,
    DEBUG,
    MONGODB_URI,
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID,
    OPENAI_API_KEY,
    AI_BASE_URL,
    AI_MODEL,
    OLD_WISE_MAN_URL
};
