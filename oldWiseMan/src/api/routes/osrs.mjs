import express from 'express';
import { getCachedHiscores } from '../../osrs/hiscores.mjs';
import Profile from '../../storage/mongo/models/Profile.mjs';
import logger from '../../utility/logger.mjs';
import { pingOSRS } from '../../osrs/connection.mjs';
import { searchWiki, getQuestInfo, getBossInfo } from '../../osrs/wiki.mjs';
import { getPetInfo } from '../../osrs/pets.mjs';
import { priceLookupByName } from '../../osrs/prices.mjs';

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
            { discordId: identifier },
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
        const { data, updatedAt, cached } = await getCachedHiscores(targetOsrsName);
        
        if (!data) {
            return res.status(404).json({ error: 'Player not found or no stats available' });
        }
        
        res.status(200).json({ osrsName: targetOsrsName, ...data, cached, updatedAt });
    } catch (error) {
        const status = error.response?.status || 500;
        if (status === 404) {
            return res.status(404).json({ error: 'Player not found on OSRS hiscores' });
        }
        if (status === 429) {
            return res.status(429).json({ error: 'Too many requests to OSRS hiscores. Please try again later.' });
        }
        
        logger.error(`Error fetching stats for ${req.params.identifier}: ${error.message}`);
        if (error.stack) logger.debug(error.stack);
        res.status(status).json({ 
            error: status === 500 ? 'Failed to fetch OSRS stats from Hiscores' : `OSRS Hiscores returned error ${status}`, 
            details: error.message 
        });
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

        const { data, updatedAt, cached } = await getCachedHiscores(targetOsrsName);
        if (!data) return res.status(404).json({ error: 'Player not found' });

        if (!data.skills || !data.skills[skill]) {
            return res.status(404).json({ error: `Skill "${skill}" not found or unranked` });
        }

        res.status(200).json({
            osrsName: targetOsrsName,
            skill,
            ...data.skills[skill],
            cached,
            updatedAt
        });
    } catch (error) {
        const status = error.response?.status || 500;
        if (status === 404) {
            return res.status(404).json({ error: 'Player not found on OSRS hiscores' });
        }
        if (status === 429) {
            return res.status(429).json({ error: 'Too many requests to OSRS hiscores. Please try again later.' });
        }
        
        logger.error(`Error fetching skill ${req.params.skill} for ${req.params.identifier}: ${error.message}`);
        if (error.stack) logger.debug(error.stack);
        res.status(status).json({ 
            error: status === 500 ? 'Internal Server Error' : `OSRS Hiscores returned error ${status}`, 
            details: error.message 
        });
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

        const { data, updatedAt, cached } = await getCachedHiscores(targetOsrsName);
        if (!data) return res.status(404).json({ error: 'Player not found' });

        if (!data.bossRecords || !data.bossRecords[boss]) {
            return res.status(404).json({ error: `Boss "${boss}" not found or unranked` });
        }

        res.status(200).json({
            osrsName: targetOsrsName,
            boss,
            ...data.bossRecords[boss],
            cached,
            updatedAt
        });
    } catch (error) {
        const status = error.response?.status || 500;
        if (status === 404) {
            return res.status(404).json({ error: 'Player not found on OSRS hiscores' });
        }
        if (status === 429) {
            return res.status(429).json({ error: 'Too many requests to OSRS hiscores. Please try again later.' });
        }
        
        logger.error(`Error fetching boss ${req.params.boss} for ${req.params.identifier}: ${error.message}`);
        if (error.stack) logger.debug(error.stack);
        res.status(status).json({ 
            error: status === 500 ? 'Internal Server Error' : `OSRS Hiscores returned error ${status}`, 
            details: error.message 
        });
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

        const { data, updatedAt, cached } = await getCachedHiscores(targetOsrsName);
        if (!data) return res.status(404).json({ error: 'Player not found' });

        if (!data.clues || !data.clues[clue]) {
            return res.status(404).json({ error: `Clue tier "${clue}" not found or unranked` });
        }

        res.status(200).json({
            osrsName: targetOsrsName,
            clue,
            ...data.clues[clue],
            cached,
            updatedAt
        });
    } catch (error) {
        const status = error.response?.status || 500;
        if (status === 404) {
            return res.status(404).json({ error: 'Player not found on OSRS hiscores' });
        }
        if (status === 429) {
            return res.status(429).json({ error: 'Too many requests to OSRS hiscores. Please try again later.' });
        }
        
        logger.error(`Error fetching clue ${req.params.clue} for ${req.params.identifier}: ${error.message}`);
        if (error.stack) logger.debug(error.stack);
        res.status(status).json({ 
            error: status === 500 ? 'Internal Server Error' : `OSRS Hiscores returned error ${status}`, 
            details: error.message 
        });
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

        const { data, updatedAt, cached } = await getCachedHiscores(targetOsrsName);
        if (!data) return res.status(404).json({ error: 'Player not found' });

        if (!data.minigames || !data.minigames[minigame]) {
            return res.status(404).json({ error: `Minigame "${minigame}" not found or unranked` });
        }

        res.status(200).json({
            osrsName: targetOsrsName,
            minigame,
            ...data.minigames[minigame],
            cached,
            updatedAt
        });
    } catch (error) {
        const status = error.response?.status || 500;
        if (status === 404) {
            return res.status(404).json({ error: 'Player not found on OSRS hiscores' });
        }
        if (status === 429) {
            return res.status(429).json({ error: 'Too many requests to OSRS hiscores. Please try again later.' });
        }
        
        logger.error(`Error fetching minigame ${req.params.minigame} for ${req.params.identifier}: ${error.message}`);
        if (error.stack) logger.debug(error.stack);
        res.status(status).json({ 
            error: status === 500 ? 'Internal Server Error' : `OSRS Hiscores returned error ${status}`, 
            details: error.message 
        });
    }
});

/**
 * @route GET /osrs/wiki/:query
 * @description Searches the OSRS Wiki for a given query.
 */
router.get('/wiki/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { results, cached, updatedAt } = await searchWiki(query);
        
        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'No wiki results found' });
        }

        res.status(200).json({ results, cached, updatedAt });
    } catch (error) {
        logger.error(`Error in wiki route for "${req.params.query}": ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

/**
 * @route GET /osrs/price/:item or /osrs/pricelookup/:item
 * @description Looks up latest GE price for item by name. Caches for 1 day.
 */
router.get(['/price/:item', '/pricelookup/:item'], async (req, res) => {
    try {
        const { item } = req.params;
        const result = await priceLookupByName(item);
        if (result.notFound) {
            return res.status(404).json({ error: result.message, query: result.query });
        }
        res.status(200).json(result);
    } catch (error) {
        logger.error(`Error in price lookup for "${req.params.item}": ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

/**
 * @route GET /osrs/quest/:name
 * @description Fetches quest information and wiki link.
 */
router.get('/quest/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const result = await getQuestInfo(name);
        
        if (result.notFound) {
            return res.status(404).json({ error: `Quest "${name}" not found.` });
        }

        res.status(200).json(result);
    } catch (error) {
        logger.error(`Error in quest route for "${req.params.name}": ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

/**
 * @route GET /osrs/boss/:name
 * @description Fetches boss information and wiki link.
 */
router.get('/boss/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const result = await getBossInfo(name);
        
        if (result.notFound) {
            return res.status(404).json({ error: `Boss "${name}" not found.` });
        }

        // Add pet info if available
        const pet = getPetInfo(result.title);
        if (pet) {
            result.pet = pet;
        }

        res.status(200).json(result);
    } catch (error) {
        logger.error(`Error in boss route for "${req.params.name}": ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

/**
 * @route GET /osrs/boss/:name/pet
 * @description Fetches pet information for a specific boss.
 */
router.get('/boss/:name/pet', async (req, res) => {
    try {
        const { name } = req.params;
        const bossResult = await getBossInfo(name);
        
        const title = bossResult.notFound ? name : bossResult.title;
        const pet = getPetInfo(title);

        if (!pet) {
            return res.status(404).json({ error: `Pet info for boss "${title}" not found.` });
        }

        res.status(200).json({
            boss: title,
            pet
        });
    } catch (error) {
        logger.error(`Error in boss pet route for "${req.params.name}": ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

export default router;
