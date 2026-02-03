import express from 'express';
import { Hiscores } from 'oldschooljs';
import Profile from '../../storage/mongo/models/Profile.mjs';
import logger from '../../utility/logger.mjs';
import { pingOSRS } from '../../osrs/connection.mjs';
import { cleanHiscoresResponse } from '../../osrs/utils.mjs';
import { searchWiki } from '../../osrs/wiki.mjs';

const router = express.Router();

/**
 * @description Helper to resolve an identifier to an OSRS name.
 * Searches by uuid, profile username, or direct osrsName.
 * @param {string} identifier - The identifier to resolve.
 * @returns {Promise<string>} The resolved OSRS name.
 */
async function resolveOsrsName(identifier) {
    const profile = await Profile.findOne({
        $or: [
            { uuid: identifier },
            { username: identifier },
            { osrsName: identifier }
        ]
    });

    if (profile && profile.osrsName) {
        logger.debug(`Resolved identifier "${identifier}" to OSRS name "${profile.osrsName}"`);
        return profile.osrsName;
    }
    return identifier;
}

/**
 * @route GET /osrs/ping
 * @description Pings OSRS hiscores to check connectivity.
 */
router.get('/ping', async (req, res) => {
    logger.debug('OSRS ping requested');
    const status = await pingOSRS();
    res.status(status.online ? 200 : 503).json(status);
});

/**
 * @route GET /osrs/stats/:identifier
 * @description Fetches OSRS stats for a given identifier (uuid, username, or osrsName) using oldschooljs.
 */
router.get('/stats/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        const targetOsrsName = await resolveOsrsName(identifier);

        logger.debug(`Fetching OSRS stats for ${targetOsrsName}`);
        const stats = await Hiscores.fetch(targetOsrsName);
        
        if (!stats) {
            return res.status(404).json({ error: 'Player not found or no stats available' });
        }
        
        const cleanedStats = cleanHiscoresResponse(stats);
        res.status(200).json(cleanedStats);
    } catch (error) {
        logger.error(`Error fetching stats for ${req.params.identifier}: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch OSRS stats from Hiscores' });
    }
});

/**
 * @route GET /osrs/stats/:identifier/skill/:skill
 * @description Fetches a specific OSRS skill for a given identifier.
 */
router.get('/stats/:identifier/skill/:skill', async (req, res) => {
    try {
        const { identifier, skill } = req.params;
        const targetOsrsName = await resolveOsrsName(identifier);

        const stats = await Hiscores.fetch(targetOsrsName);
        if (!stats) return res.status(404).json({ error: 'Player not found' });

        const cleaned = cleanHiscoresResponse(stats);
        if (!cleaned.skills || !cleaned.skills[skill]) {
            return res.status(404).json({ error: `Skill "${skill}" not found or unranked` });
        }

        res.status(200).json({
            osrsName: targetOsrsName,
            skill,
            ...cleaned.skills[skill]
        });
    } catch (error) {
        logger.error(`Error fetching skill ${req.params.skill} for ${req.params.identifier}: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route GET /osrs/stats/:identifier/boss/:boss
 * @description Fetches a specific OSRS boss kill count for a given identifier.
 */
router.get('/stats/:identifier/boss/:boss', async (req, res) => {
    try {
        const { identifier, boss } = req.params;
        const targetOsrsName = await resolveOsrsName(identifier);

        const stats = await Hiscores.fetch(targetOsrsName);
        if (!stats) return res.status(404).json({ error: 'Player not found' });

        const cleaned = cleanHiscoresResponse(stats);
        if (!cleaned.bossRecords || !cleaned.bossRecords[boss]) {
            return res.status(404).json({ error: `Boss "${boss}" not found or unranked` });
        }

        res.status(200).json({
            osrsName: targetOsrsName,
            boss,
            ...cleaned.bossRecords[boss]
        });
    } catch (error) {
        logger.error(`Error fetching boss ${req.params.boss} for ${req.params.identifier}: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route GET /osrs/stats/:identifier/clues/:clue
 * @description Fetches a specific OSRS clue tier completion for a given identifier.
 */
router.get('/stats/:identifier/clues/:clue', async (req, res) => {
    try {
        const { identifier, clue } = req.params;
        const targetOsrsName = await resolveOsrsName(identifier);

        const stats = await Hiscores.fetch(targetOsrsName);
        if (!stats) return res.status(404).json({ error: 'Player not found' });

        const cleaned = cleanHiscoresResponse(stats);
        if (!cleaned.clues || !cleaned.clues[clue]) {
            return res.status(404).json({ error: `Clue tier "${clue}" not found or unranked` });
        }

        res.status(200).json({
            osrsName: targetOsrsName,
            clue,
            ...cleaned.clues[clue]
        });
    } catch (error) {
        logger.error(`Error fetching clue ${req.params.clue} for ${req.params.identifier}: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route GET /osrs/stats/:identifier/minigames/:minigame
 * @description Fetches a specific OSRS minigame score for a given identifier.
 */
router.get('/stats/:identifier/minigames/:minigame', async (req, res) => {
    try {
        const { identifier, minigame } = req.params;
        const targetOsrsName = await resolveOsrsName(identifier);

        const stats = await Hiscores.fetch(targetOsrsName);
        if (!stats) return res.status(404).json({ error: 'Player not found' });

        const cleaned = cleanHiscoresResponse(stats);
        if (!cleaned.minigames || !cleaned.minigames[minigame]) {
            return res.status(404).json({ error: `Minigame "${minigame}" not found or unranked` });
        }

        res.status(200).json({
            osrsName: targetOsrsName,
            minigame,
            ...cleaned.minigames[minigame]
        });
    } catch (error) {
        logger.error(`Error fetching minigame ${req.params.minigame} for ${req.params.identifier}: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route GET /osrs/wiki/:query
 * @description Searches the OSRS Wiki for a given query.
 */
router.get('/wiki/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const results = await searchWiki(query);
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'No wiki results found' });
        }

        res.status(200).json(results);
    } catch (error) {
        logger.error(`Error in wiki route for "${req.params.query}": ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
