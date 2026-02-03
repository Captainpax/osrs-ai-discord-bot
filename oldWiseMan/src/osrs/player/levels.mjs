/**
 * @module OSRS_Levels
 * @description Utilities for OSRS levels and experience calculation.
 */

/**
 * @description Calculates the OSRS level for a given amount of experience.
 * @param {number} experience - The total experience points.
 * @returns {number} The corresponding level (1-99).
 */
export function getLevelForExperience(experience) {
    let points = 0;
    let output = 0;

    for (let i = 1; i < 100; i++) {
        points += Math.floor(i + 300 * Math.pow(2, i / 7.0));
        output = Math.floor(points / 4);
        if (output >= experience) return i;
    }
    return 99;
}

/**
 * @description Gets the experience required for a specific level.
 * @param {number} level - The level (1-99).
 * @returns {number} The experience required.
 */
export function getExperienceForLevel(level) {
    let points = 0;
    let output = 0;
    for (let i = 1; i < level; i++) {
        points += Math.floor(i + 300 * Math.pow(2, i / 7.0));
        output = Math.floor(points / 4);
    }
    return output;
}

export default {
    getLevelForExperience,
    getExperienceForLevel
};
