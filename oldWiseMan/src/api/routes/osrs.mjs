import express from 'express';
import { getCachedHiscores } from '../../osrs/hiscores.mjs';
import Profile from '../../storage/mongo/models/Profile.mjs';
import logger from '../../utility/logger.mjs';
import { Hiscores } from 'oldschooljs';
import { pingOSRS } from '../../osrs/connection.mjs';
import { calculateCombatLevel, cleanHiscoresResponse } from '../../osrs/utils.mjs';
import { searchWiki, searchQuests, searchBosses, getQuestInfo, getBossInfo, getWikiPage } from '../../osrs/wiki.mjs';
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
        
        const combatLevel = calculateCombatLevel(data.skills);
        
        res.status(200).json({ osrsName: targetOsrsName, ...data, combatLevel, cached, updatedAt });
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
        const status = error.response?.status || 500;
        logger.error(`Error in wiki route for "${req.params.query}": ${error.message}`);
        res.status(status).json({ 
            error: status === 429 ? 'Too many requests to OSRS Wiki. Please try again later.' : 'Internal Server Error', 
            details: error.message 
        });
    }
});

/**
 * @route GET /osrs/wiki/page/:title
 * @description Fetches a specific OSRS Wiki page by title.
 */
router.get('/wiki/page/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const result = await getWikiPage(title);
        
        if (result.notFound) {
            return res.status(404).json({ error: `Wiki page "${title}" not found.` });
        }

        res.status(200).json(result);
    } catch (error) {
        const status = error.response?.status || 500;
        logger.error(`Error in wiki page route for "${req.params.title}": ${error.message}`);
        res.status(status).json({ 
            error: status === 429 ? 'Too many requests to OSRS Wiki. Please try again later.' : 'Internal Server Error', 
            details: error.message 
        });
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
        const status = error.response?.status || 500;
        logger.error(`Error in price lookup for "${req.params.item}": ${error.message}`);
        res.status(status).json({ 
            error: status === 429 ? 'Too many requests to OSRS Prices API. Please try again later.' : 'Internal Server Error', 
            details: error.message 
        });
    }
});

/**
 * @route GET /osrs/quest/search/:query
 * @description Searches for OSRS quests.
 */
router.get('/quest/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { results, cached, updatedAt } = await searchQuests(query);
        
        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'No quests found matching your search.' });
        }

        res.status(200).json({ results, cached, updatedAt });
    } catch (error) {
        const status = error.response?.status || 500;
        logger.error(`Error in quest search route for "${req.params.query}": ${error.message}`);
        res.status(status).json({ 
            error: status === 429 ? 'Too many requests to OSRS Wiki. Please try again later.' : 'Internal Server Error', 
            details: error.message 
        });
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
        const status = error.response?.status || 500;
        logger.error(`Error in quest route for "${req.params.name}": ${error.message}`);
        res.status(status).json({ 
            error: status === 429 ? 'Too many requests to OSRS Wiki. Please try again later.' : 'Internal Server Error', 
            details: error.message 
        });
    }
});

/**
 * @route GET /osrs/boss/search/:query
 * @description Searches for OSRS bosses.
 */
router.get('/boss/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { results, cached, updatedAt } = await searchBosses(query);
        
        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'No bosses found matching your search.' });
        }

        res.status(200).json({ results, cached, updatedAt });
    } catch (error) {
        const status = error.response?.status || 500;
        logger.error(`Error in boss search route for "${req.params.query}": ${error.message}`);
        res.status(status).json({ 
            error: status === 429 ? 'Too many requests to OSRS Wiki. Please try again later.' : 'Internal Server Error', 
            details: error.message 
        });
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
        const status = error.response?.status || 500;
        logger.error(`Error in boss route for "${req.params.name}": ${error.message}`);
        res.status(status).json({ 
            error: status === 429 ? 'Too many requests to OSRS Wiki. Please try again later.' : 'Internal Server Error', 
            details: error.message 
        });
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
        const status = error.response?.status || 500;
        logger.error(`Error in boss pet route for "${req.params.name}": ${error.message}`);
        res.status(status).json({ 
            error: status === 429 ? 'Too many requests to OSRS Wiki. Please try again later.' : 'Internal Server Error', 
            details: error.message 
        });
    }
});

/**
 * @route GET /osrs/leaderboard
 * @description Fetches top players among linked profiles.
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const profiles = await Profile.find({ osrsName: { $ne: null } });
        const leaderboard = [];
        let highestGainer = { osrsName: null, gains: -1, discordId: null };

        const now = new Date();
        // Start of week (Monday 00:00)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay(); // 0 is Sun, 1 is Mon...
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        for (const profile of profiles) {
            try {
                const { data } = await getCachedHiscores(profile.osrsName);
                if (data && data.skills) {
                    const currentOverall = data.skills.overall?.level || 0;
                    
                    // Reset weekly stats if needed
                    // If reset date is before this week's start, it means we need a new starting point
                    if (!profile.weeklyStats || !profile.weeklyResetDate || profile.weeklyResetDate < startOfWeek) {
                        profile.weeklyStats = { skills: data.skills };
                        profile.weeklyResetDate = now;
                        await profile.save();
                    }

                    const weeklyGains = currentOverall - (profile.weeklyStats?.skills?.overall?.level || currentOverall);
                    
                    if (weeklyGains > highestGainer.gains) {
                        highestGainer = {
                            osrsName: profile.osrsName,
                            gains: weeklyGains,
                            discordId: profile.discordId
                        };
                    }

                    leaderboard.push({
                        discordId: profile.discordId,
                        osrsName: profile.osrsName,
                        totalLevel: currentOverall,
                        totalXP: data.skills.overall?.xp || 0,
                        weeklyGains
                    });
                }
            } catch (err) {
                logger.error(`Error fetching leaderboard stats for ${profile.osrsName}: ${err.message}`);
            }
        }

        // Sort by total level DESC, then total XP DESC
        leaderboard.sort((a, b) => {
            if (b.totalLevel !== a.totalLevel) return b.totalLevel - a.totalLevel;
            return b.totalXP - a.totalXP;
        });

        res.status(200).json({
            leaderboard: leaderboard.slice(0, 20),
            highestGainer: highestGainer.osrsName ? highestGainer : null
        });
    } catch (error) {
        logger.error(`Leaderboard error: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

/**
 * @route GET /osrs/check-level-ups
 * @description Compares current hiscores with last known stats to find level ups.
 */
router.get('/check-level-ups', async (req, res) => {
    try {
        const profiles = await Profile.find({ osrsName: { $ne: null } });
        const levelUps = [];

        for (const profile of profiles) {
            try {
                logger.debug(`Checking level-ups for ${profile.osrsName}`);
                const stats = await Hiscores.fetch(profile.osrsName);
                if (!stats || !stats.skills) continue;
                
                const currentSkills = cleanHiscoresResponse(stats.skills);
                const lastSkills = profile.lastStats?.skills;
                
                if (lastSkills) {
                    const diffs = [];
                    for (const [skill, data] of Object.entries(currentSkills)) {
                        const oldLevel = lastSkills[skill]?.level || 0;
                        if (data.level > oldLevel && oldLevel > 0) {
                            diffs.push({
                                skill,
                                oldLevel,
                                newLevel: data.level
                            });
                        }
                    }
                    
                    if (diffs.length > 0) {
                        levelUps.push({
                            discordId: profile.discordId,
                            osrsName: profile.osrsName,
                            diffs
                        });
                    }
                }
                
                profile.lastStats = { skills: currentSkills, updatedAt: new Date() };
                
                // Also initialize weeklyStats if it doesn't exist
                if (!profile.weeklyStats) {
                    profile.weeklyStats = { skills: currentSkills };
                    profile.weeklyResetDate = new Date();
                }

                await profile.save();
                
            } catch (err) {
                logger.error(`Error checking level ups for ${profile.osrsName}: ${err.message}`);
            }
        }

        res.status(200).json(levelUps);
    } catch (error) {
        logger.error(`Level-up check error: ${error.message}`);
        res.status(500).json({ error: 'Failed to check level ups' });
    }
});

export default router;
