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
 */

export const PORT = process.env.PORT || 3000;
export const DEBUG = process.env.DEBUG === 'true';
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oldWiseMan';
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export default {
    PORT,
    DEBUG,
    MONGODB_URI,
    JWT_SECRET
};
