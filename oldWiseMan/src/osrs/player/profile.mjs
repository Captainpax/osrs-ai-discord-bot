import Profile from '../../storage/mongo/models/Profile.mjs';
import { Hiscores } from 'oldschooljs';
import logger from '../../utility/logger.mjs';

/**
 * @module OSRS_Profile
 * @description Utilities for combining database profile data with OSRS Hiscores data.
 */

/**
 * @description Retrieves a full profile including OSRS stats if linked.
 * @param {string} uuid - The profile UUID.
 * @returns {Promise<object|null>} The combined profile and stats object.
 */
export async function getFullProfile(uuid) {
    try {
        const profile = await Profile.findOne({ uuid });
        if (!profile) {
            logger.debug(`Profile not found for UUID: ${uuid}`);
            return null;
        }

        let osrsStats = null;
        if (profile.osrsName) {
            logger.debug(`Fetching OSRS stats for linked name: ${profile.osrsName}`);
            osrsStats = await Hiscores.fetch(profile.osrsName);
        }

        return {
            ...profile.toObject(),
            osrsStats
        };
    } catch (error) {
        logger.error(`Error getting full profile for ${uuid}: ${error.message}`);
        throw error;
    }
}

export default {
    getFullProfile
};
