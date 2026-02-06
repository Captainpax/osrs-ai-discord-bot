import { Wiki } from 'oldschooljs';
import logger from '../utility/logger.mjs';
import { getCachedOrFetch } from '../storage/mongo/cache.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @module WikiLookup
 * @description Provides functionality to search the OSRS Wiki.
 */

/**
 * @description Searches the OSRS Wiki for a given query. Uses 1-day caching.
 * @param {string} query - The search term.
 * @returns {Promise<{results: Array<object>, cached: boolean, updatedAt: Date}>}
 */
export async function searchWiki(query) {
    try {
        const key = `osrs:wiki:${String(query).trim().toLowerCase()}`;
        const { data, updatedAt, cached } = await getCachedOrFetch(key, DAY_MS, async () => {
            logger.debug(`Searching OSRS Wiki for: "${query}"`);
            const results = await Wiki.search(query);
            return { results };
        });

        const results = data?.results || [];
        if (!results || results.length === 0) {
            logger.debug(`No results found for wiki query: "${query}"`);
        }

        return { results, cached, updatedAt };
    } catch (error) {
        logger.error(`Error searching OSRS Wiki for "${query}": ${error.message}`);
        throw error;
    }
}

/**
 * @description Fetches detailed info for a quest by name.
 * @param {string} questName
 * @returns {Promise<object>}
 */
export async function getQuestInfo(questName) {
    try {
        const key = `osrs:quest:${String(questName).trim().toLowerCase()}`;
        const { data, updatedAt, cached } = await getCachedOrFetch(key, DAY_MS, async () => {
            logger.debug(`Fetching quest info for: "${questName}"`);
            
            // Search to find the best match. oldschooljs Wiki.search already returns extracts, etc.
            const searchResults = await Wiki.search(questName);
            if (!searchResults || searchResults.length === 0) {
                return { notFound: true };
            }

            // Take the first result - it's usually the most relevant
            const bestMatch = searchResults[0];
            
            return {
                title: bestMatch.title,
                extract: bestMatch.extract,
                url: bestMatch.url,
                image: bestMatch.image
            };
        });

        return { ...data, cached, updatedAt };
    } catch (error) {
        logger.error(`Error fetching quest info for "${questName}": ${error.message}`);
        throw error;
    }
}

/**
 * @description Fetches detailed info for a boss by name.
 * @param {string} bossName
 * @returns {Promise<object>}
 */
export async function getBossInfo(bossName) {
    try {
        const key = `osrs:boss:${String(bossName).trim().toLowerCase()}`;
        const { data, updatedAt, cached } = await getCachedOrFetch(key, DAY_MS, async () => {
            logger.debug(`Fetching boss info for: "${bossName}"`);
            
            // Search to find the best match.
            const searchResults = await Wiki.search(bossName);
            if (!searchResults || searchResults.length === 0) {
                return { notFound: true };
            }

            const bestMatch = searchResults[0];
            
            return {
                title: bestMatch.title,
                extract: bestMatch.extract,
                url: bestMatch.url,
                image: bestMatch.image
            };
        });

        return { ...data, cached, updatedAt };
    } catch (error) {
        logger.error(`Error fetching boss info for "${bossName}": ${error.message}`);
        throw error;
    }
}

export default {
    searchWiki,
    getQuestInfo,
    getBossInfo
};
