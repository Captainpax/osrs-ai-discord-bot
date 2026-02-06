import { Hiscores } from 'oldschooljs';
import logger from '../utility/logger.mjs';
import { getCachedOrFetch } from '../storage/mongo/cache.mjs';
import { cleanHiscoresResponse } from './utils.mjs';

const HOUR_MS = 60 * 60 * 1000;

/**
 * @module HiscoresCache
 * @description Provides cached access to OSRS Hiscores.
 */

/**
 * @description Fetches OSRS Hiscores data for a player, with 1-hour caching.
 * @param {string} osrsName - The OSRS username.
 * @returns {Promise<{data: object, updatedAt: Date, cached: boolean}>}
 */
export async function getCachedHiscores(osrsName) {
    if (!osrsName) return { data: null, cached: false };

    const key = `osrs:hiscores:${osrsName.trim().toLowerCase()}`;
    
    try {
        return await getCachedOrFetch(key, HOUR_MS, async () => {
            logger.debug(`Fetching fresh OSRS hiscores for: "${osrsName}"`);
            const stats = await Hiscores.fetch(osrsName);
            if (!stats) return null;
            return cleanHiscoresResponse(stats);
        });
    } catch (error) {
        logger.error(`Error in getCachedHiscores for "${osrsName}": ${error.message}`);
        throw error;
    }
}

export default {
    getCachedHiscores
};
