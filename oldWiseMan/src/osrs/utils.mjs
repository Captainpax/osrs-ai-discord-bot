
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
        // Skip properties with value -1 or 0 (for score/rank) as they are considered "useless" (unranked)
        if (value === -1 || ((key === 'score' || key === 'rank') && value === 0)) {
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

/**
 * @description Calculates OSRS combat level.
 * @param {object} skills - The skills object from Hiscores.
 * @returns {number} The combat level.
 */
export function calculateCombatLevel(skills) {
    if (!skills) return 3;

    const def = skills.defence?.level || 1;
    const hp = skills.hitpoints?.level || 10;
    const pray = skills.prayer?.level || 1;
    const att = skills.attack?.level || 1;
    const str = skills.strength?.level || 1;
    const ranged = skills.ranged?.level || 1;
    const magic = skills.magic?.level || 1;

    const base = 0.25 * (def + hp + Math.floor(pray / 2));
    const melee = 0.325 * (att + str);
    const range = 0.325 * Math.floor(3 / 2 * ranged);
    const mage = 0.325 * Math.floor(3 / 2 * magic);

    return Math.floor(base + Math.max(melee, range, mage));
}
