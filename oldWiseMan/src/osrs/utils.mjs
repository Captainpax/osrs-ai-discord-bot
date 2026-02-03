
/**
 * @module OSRSUtils
 * @description Utility functions for processing OSRS data.
 */

/**
 * @description Recursively removes properties with value -1 from an object.
 * This is useful for cleaning up OSRS Hiscores responses where -1 represents unranked.
 * 
 * @param {object} obj - The object to clean.
 * @returns {object} The cleaned object.
 */
export function cleanHiscoresResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(cleanHiscoresResponse);
    }

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        // Skip properties with value -1 as they are considered "useless" (unranked)
        if (value === -1) {
            continue;
        }
        
        if (typeof value === 'object' && value !== null) {
            const nestedCleaned = cleanHiscoresResponse(value);
            // Only add the object if it's not empty after cleaning
            if (Object.keys(nestedCleaned).length > 0) {
                cleaned[key] = nestedCleaned;
            }
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
}
