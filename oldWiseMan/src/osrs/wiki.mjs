import { Wiki } from 'oldschooljs';
import logger from '../utility/logger.mjs';

/**
 * @module WikiLookup
 * @description Provides functionality to search the OSRS Wiki.
 */

/**
 * @description Searches the OSRS Wiki for a given query.
 * @param {string} query - The search term.
 * @returns {Promise<Array<object>>} An array of search results.
 */
export async function searchWiki(query) {
    try {
        logger.debug(`Searching OSRS Wiki for: "${query}"`);
        const results = await Wiki.search(query);
        
        if (!results || results.length === 0) {
            logger.debug(`No results found for wiki query: "${query}"`);
            return [];
        }

        return results;
    } catch (error) {
        logger.error(`Error searching OSRS Wiki for "${query}": ${error.message}`);
        throw error;
    }
}

export default {
    searchWiki
};
