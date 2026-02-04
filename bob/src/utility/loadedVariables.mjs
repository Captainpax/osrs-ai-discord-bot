import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (one level up from src/utility)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * @module LoadedVariables
 * @description Centralized environment variables for the project.
 * Uses dotenv to load variables from the .env file.
 */

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
export const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
export const DEBUG = process.env.DEBUG === 'true';

/**
 * @description Default export containing all environment variables.
 */
export default {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID,
    DEBUG
};
