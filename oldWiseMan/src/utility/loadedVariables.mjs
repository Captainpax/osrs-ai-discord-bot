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

export const OLD_WISE_MAN_PORT = process.env.OLD_WISE_MAN_PORT || process.env.PORT || 3000;
export const DEBUG = process.env.DEBUG === 'true';
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oldWiseMan';
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
export const N8N_API_KEY = process.env.N8N_API_KEY;

export default {
    OLD_WISE_MAN_PORT,
    DEBUG,
    MONGODB_URI,
    JWT_SECRET,
    N8N_API_KEY
};
