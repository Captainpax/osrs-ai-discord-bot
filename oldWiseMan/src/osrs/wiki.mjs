import { Wiki } from 'oldschooljs';
import axios from 'axios';
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
            let results = await Wiki.search(query);
            
            if (results && results.length > 0) {
                const q = query.toLowerCase().trim();
                // Improved ranking logic
                results.sort((a, b) => {
                    const aTitle = a.title.toLowerCase();
                    const bTitle = b.title.toLowerCase();

                    // 1. Exact match
                    if (aTitle === q && bTitle !== q) return -1;
                    if (bTitle === q && aTitle !== q) return 1;

                    // 2. Starts with query (prioritizing shorter titles)
                    const aStarts = aTitle.startsWith(q);
                    const bStarts = bTitle.startsWith(q);
                    if (aStarts && !bStarts) return -1;
                    if (bStarts && !aStarts) return 1;
                    if (aStarts && bStarts) return aTitle.length - bTitle.length;

                    // 3. Contains query (prioritizing shorter titles)
                    const aIncludes = aTitle.includes(q);
                    const bIncludes = bTitle.includes(q);
                    if (aIncludes && !bIncludes) return -1;
                    if (bIncludes && !aIncludes) return 1;
                    if (aIncludes && bIncludes) return aTitle.length - bTitle.length;

                    return 0;
                });
            }

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

export async function searchQuests(query) {
    try {
        const key = `osrs:quest:search:${String(query).trim().toLowerCase()}`;
        const { data, updatedAt, cached } = await getCachedOrFetch(key, DAY_MS, async () => {
            logger.debug(`Searching OSRS Wiki for quests matching: "${query}"`);
            let results = await Wiki.search(query);
            
            if (results && results.length > 0) {
                // Filter for quests - check if Category:Quests is in any of the categories
                results = results.filter(r => 
                    r.categories && r.categories.some(c => c.title === 'Category:Quests')
                );
                
                const q = query.toLowerCase().trim();
                // Improved ranking logic specifically for quests
                results.sort((a, b) => {
                    const aTitle = a.title.toLowerCase();
                    const bTitle = b.title.toLowerCase();

                    // 1. Exact match
                    if (aTitle === q && bTitle !== q) return -1;
                    if (bTitle === q && aTitle !== q) return 1;

                    // 2. Starts with query (prioritizing shorter titles)
                    const aStarts = aTitle.startsWith(q);
                    const bStarts = bTitle.startsWith(q);
                    if (aStarts && !bStarts) return -1;
                    if (bStarts && !aStarts) return 1;
                    if (aStarts && bStarts) return aTitle.length - bTitle.length;

                    // 3. Contains query (prioritizing shorter titles)
                    const aIncludes = aTitle.includes(q);
                    const bIncludes = bTitle.includes(q);
                    if (aIncludes && !bIncludes) return -1;
                    if (bIncludes && !aIncludes) return 1;
                    if (aIncludes && bIncludes) return aTitle.length - bTitle.length;

                    return 0;
                });
            }

            return { results };
        });

        const results = data?.results || [];
        return { results, cached, updatedAt };
    } catch (error) {
        logger.error(`Error searching OSRS Wiki for quests "${query}": ${error.message}`);
        throw error;
    }
}

export async function searchBosses(query) {
    try {
        const key = `osrs:boss:search:${String(query).trim().toLowerCase()}`;
        const { data, updatedAt, cached } = await getCachedOrFetch(key, DAY_MS, async () => {
            logger.debug(`Searching OSRS Wiki for bosses matching: "${query}"`);
            let results = await Wiki.search(query);
            
            if (results && results.length > 0) {
                // Filter for bosses - check if Category:Bosses or Category:Raids is in any of the categories
                results = results.filter(r => 
                    r.categories && r.categories.some(c => c.title === 'Category:Bosses' || c.title === 'Category:Raids')
                );
                
                const q = query.toLowerCase().trim();
                // Improved ranking logic specifically for bosses
                results.sort((a, b) => {
                    const aTitle = a.title.toLowerCase();
                    const bTitle = b.title.toLowerCase();

                    // 1. Exact match
                    if (aTitle === q && bTitle !== q) return -1;
                    if (bTitle === q && aTitle !== q) return 1;

                    // 2. Starts with query (prioritizing shorter titles)
                    const aStarts = aTitle.startsWith(q);
                    const bStarts = bTitle.startsWith(q);
                    if (aStarts && !bStarts) return -1;
                    if (bStarts && !aStarts) return 1;
                    if (aStarts && bStarts) return aTitle.length - bTitle.length;

                    // 3. Contains query (prioritizing shorter titles)
                    const aIncludes = aTitle.includes(q);
                    const bIncludes = bTitle.includes(q);
                    if (aIncludes && !bIncludes) return -1;
                    if (bIncludes && !aIncludes) return 1;
                    if (aIncludes && bIncludes) return aTitle.length - bTitle.length;

                    return 0;
                });
            }

            return { results };
        });

        const results = data?.results || [];
        return { results, cached, updatedAt };
    } catch (error) {
        logger.error(`Error searching OSRS Wiki for bosses "${query}": ${error.message}`);
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
            
            const result = {
                title: bestMatch.title,
                extract: bestMatch.extract,
                url: bestMatch.url,
                image: bestMatch.image
            };

            if (bestMatch.categories && bestMatch.categories.some(c => c.title === 'Category:Quests')) {
                const questDetails = await fetchQuestDetails(bestMatch.title);
                if (questDetails) {
                    result.questDetails = questDetails;
                }
            } else if (bestMatch.categories && bestMatch.categories.some(c => c.title === 'Category:Bosses' || c.title === 'Category:Raids')) {
                const bossDetails = await fetchBossDetails(bestMatch.title);
                if (bossDetails) {
                    result.bossDetails = bossDetails;
                }
            }

            return result;
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
            
            const result = {
                title: bestMatch.title,
                extract: bestMatch.extract,
                url: bestMatch.url,
                image: bestMatch.image
            };

            if (bestMatch.categories && bestMatch.categories.some(c => c.title === 'Category:Bosses' || c.title === 'Category:Raids')) {
                const bossDetails = await fetchBossDetails(bestMatch.title);
                if (bossDetails) {
                    result.bossDetails = bossDetails;
                }
            }

            return result;
        });

        return { ...data, cached, updatedAt };
    } catch (error) {
        logger.error(`Error fetching boss info for "${bossName}": ${error.message}`);
        throw error;
    }
}

export async function getWikiPage(title) {
    try {
        const key = `osrs:wiki:page:${String(title).trim().toLowerCase()}`;
        const { data, updatedAt, cached } = await getCachedOrFetch(key, DAY_MS, async () => {
            logger.debug(`Fetching wiki page for: "${title}"`);
            const searchResults = await Wiki.search(title);
            if (!searchResults || searchResults.length === 0) {
                return { notFound: true };
            }
            // Find exact match or just take the first one
            const bestMatch = searchResults.find(r => r.title.toLowerCase() === title.toLowerCase()) || searchResults[0];
            
            const result = {
                title: bestMatch.title,
                extract: bestMatch.extract,
                url: bestMatch.url,
                image: bestMatch.image
            };

            if (bestMatch.categories && bestMatch.categories.some(c => c.title === 'Category:Quests')) {
                const questDetails = await fetchQuestDetails(bestMatch.title);
                if (questDetails) {
                    result.questDetails = questDetails;
                }
            } else if (bestMatch.categories && bestMatch.categories.some(c => c.title === 'Category:Bosses' || c.title === 'Category:Raids')) {
                const bossDetails = await fetchBossDetails(bestMatch.title);
                if (bossDetails) {
                    result.bossDetails = bossDetails;
                }
            }

            return result;
        });
        return { ...data, cached, updatedAt };
    } catch (error) {
        logger.error(`Error fetching wiki page for "${title}": ${error.message}`);
        throw error;
    }
}

/**
 * @description Fetches quest details from the OSRS Wiki.
 * @param {string} title 
 * @returns {Promise<object|null>}
 */
async function fetchQuestDetails(title) {
    try {
        const sectionsUrl = `https://oldschool.runescape.wiki/api.php?action=parse&format=json&page=${encodeURIComponent(title)}&prop=sections`;
        const sectionsRes = await axios.get(sectionsUrl);
        const sections = sectionsRes.data?.parse?.sections;
        if (!sections) return null;

        const detailsSection = sections.find(s => s.line === 'Details');
        if (!detailsSection) return null;

        const wikitextUrl = `https://oldschool.runescape.wiki/api.php?action=parse&format=json&page=${encodeURIComponent(title)}&prop=wikitext&section=${detailsSection.index}`;
        const wikitextRes = await axios.get(wikitextUrl);
        const wikitext = wikitextRes.data?.parse?.wikitext?.['*'];
        if (!wikitext) return null;

        return parseQuestDetailsWikitext(wikitext);
    } catch (err) {
        logger.error(`Error fetching quest details for ${title}: ${err.message}`);
        return null;
    }
}

/**
 * @description Parses the Quest details template from wikitext.
 * @param {string} wikitext 
 * @returns {object|null}
 */
function parseQuestDetailsWikitext(wikitext) {
    const templateName = 'Quest details';
    const startIdx = wikitext.indexOf(`{{${templateName}`);
    if (startIdx === -1) return null;
    
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < wikitext.length; i++) {
        if (wikitext[i] === '{' && wikitext[i+1] === '{') {
            depth++;
            i++;
        } else if (wikitext[i] === '}' && wikitext[i+1] === '}') {
            depth--;
            i++;
            if (depth === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }
    
    if (endIdx === -1) return null;
    const content = wikitext.substring(startIdx + templateName.length + 2, endIdx - 2);

    const details = {};
    // Split by | but only those at the start of a line (or preceded by a newline)
    const params = content.split(/\n\s*\|/).map(p => p.trim()).filter(p => p);

    for (const param of params) {
        const index = param.indexOf('=');
        if (index === -1) continue;
        const key = param.substring(0, index).trim();
        const value = param.substring(index + 1).trim();
        if (key && value) {
            details[key] = cleanWikitext(value);
        }
    }

    return details;
}

/**
 * @description Fetches boss details from the OSRS Wiki.
 * @param {string} title 
 * @returns {Promise<object|null>}
 */
async function fetchBossDetails(title) {
    try {
        const url = `https://oldschool.runescape.wiki/api.php?action=parse&format=json&page=${encodeURIComponent(title)}&prop=wikitext`;
        const res = await axios.get(url);
        const wikitext = res.data?.parse?.wikitext?.['*'];
        if (!wikitext) return null;

        return parseBossDetailsWikitext(wikitext);
    } catch (err) {
        logger.error(`Error fetching boss details for ${title}: ${err.message}`);
        return null;
    }
}

/**
 * @description Parses boss details from wikitext.
 * @param {string} wikitext 
 * @returns {object}
 */
function parseBossDetailsWikitext(wikitext) {
    const details = {};

    // 1. Find Location
    const locationMatch = wikitext.match(/\|\s*location\s*=\s*([^|\n}]+)/i);
    if (locationMatch) {
        details.location = cleanWikitext(locationMatch[1]);
    }

    // 2. Find Drops (limit to 8)
    const drops = [];
    const dropRegex = /\{\{DropsLine\|name=([^|{}]+)(?:\|quantity=([^|{}]+))?(?:\|rarity=([^|{}]+))?/gi;
    let match;
    while ((match = dropRegex.exec(wikitext)) !== null && drops.length < 8) {
        const name = match[1].trim();
        const quantity = match[2] ? match[2].replace(/quantity=/g, '').trim() : '';
        const rarity = match[3] ? match[3].replace(/rarity=/g, '').trim() : '';
        
        if (!drops.some(d => d.name === name) && name.toLowerCase() !== 'coins') {
            drops.push({ name, quantity, rarity });
        }
    }
    
    if (drops.length > 0) {
        details.drops = drops.map(d => {
            let str = `**${d.name}**`;
            if (d.quantity) str += ` (x${d.quantity})`;
            if (d.rarity) str += `: ${d.rarity}`;
            return str;
        }).join('\n');
    }

    return details;
}

/**
 * @description Cleans up wikitext for display.
 * @param {string} text 
 * @returns {string}
 */
function cleanWikitext(text) {
    if (!text) return '';
    return text
        .replace(/\{\{SCP\|([^|{}]+)\|([^|{}]+)[^}]*\}\}/g, '$1 $2')
        .replace(/\{\{RE\|([^|}]+)[^}]*\}\}/g, '$1')
        .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, '$2')
        .replace(/\{\{[^}]+\}\}/g, '') // Remove any remaining templates
        .replace(/'''/g, '')
        .replace(/''/g, '')
        .replace(/<poem>|<\/poem>/g, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
        .trim();
}

export default {
    searchWiki,
    searchQuests,
    searchBosses,
    getQuestInfo,
    getBossInfo,
    getWikiPage
};
