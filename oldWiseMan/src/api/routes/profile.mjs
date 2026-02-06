import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getCachedHiscores } from '../../osrs/hiscores.mjs';
import Profile from '../../storage/mongo/models/Profile.mjs';
import logger from '../../utility/logger.mjs';
import { JWT_SECRET } from '../../utility/loadedVariables.mjs';
import { authenticateToken } from '../middleware.mjs';

const router = express.Router();

/**
 * @route POST /profile/create
 * @description Creates a new user profile.
 * @body { "uuid": "12345", "username": "WiseGuy" }
 */
router.post('/create', async (req, res) => {
    try {
        const { uuid, username, discordId } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'username is required' });
        }

        if (!uuid && !discordId) {
            return res.status(400).json({ error: 'either uuid or discordId is required' });
        }

        if (discordId) {
            const existingByDiscord = await Profile.findOne({ discordId });
            if (existingByDiscord) {
                return res.status(409).json({ error: 'Profile already exists for this discordId' });
            }
        }

        if (uuid) {
            const existing = await Profile.findOne({ uuid });
            if (existing) {
                return res.status(409).json({ error: 'Profile already exists' });
            }
        }

        const finalUuid = uuid || crypto.randomUUID();
        const profile = new Profile({ uuid: finalUuid, username, discordId });
        await profile.save();

        logger.info(`Profile created for ${username} (${finalUuid})`);
        res.status(201).json(profile);
    } catch (error) {
        logger.error(`Error creating profile: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route POST /profile/login
 * @description Logs in a user by updating their status and lastLogin.
 * @body { "uuid": "12345" }
 */
router.post('/login', async (req, res) => {
    try {
        const { uuid, discordId } = req.body;
        if (!uuid && !discordId) {
            return res.status(400).json({ error: 'uuid or discordId is required' });
        }

        const query = uuid ? { uuid } : { discordId };
        const profile = await Profile.findOneAndUpdate(
            query,
            { isLoggedIn: true, lastLogin: new Date() },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        logger.info(`User ${profile.username} (${profile.uuid}) logged in`);
        
        // Generate JWT token
        const token = jwt.sign({ uuid: profile.uuid, username: profile.username }, JWT_SECRET, { expiresIn: '24h' });
        
        res.status(200).json({ profile, token });
    } catch (error) {
        logger.error(`Error during login: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route POST /profile/logout
 * @description Logs out a user.
 * @body { "uuid": "12345" }
 */
router.post('/logout', async (req, res) => {
    try {
        const { uuid } = req.body;
        if (!uuid) {
            return res.status(400).json({ error: 'uuid is required' });
        }

        const profile = await Profile.findOneAndUpdate(
            { uuid },
            { isLoggedIn: false },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        logger.info(`User ${profile.username} (${uuid}) logged out`);
        res.status(200).json(profile);
    } catch (error) {
        logger.error(`Error during logout: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route DELETE /profile/delete
 * @description Deletes a user profile. Requires JWT authentication.
 * @body { "uuid": "12345" }
 */
router.delete('/delete', authenticateToken, async (req, res) => {
    try {
        const { uuid } = req.body;
        if (!uuid) {
            return res.status(400).json({ error: 'uuid is required' });
        }

        const profile = await Profile.findOneAndDelete({ uuid });

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        logger.info(`Profile deleted for ${profile.username} (${uuid})`);
        res.status(200).json({ message: 'Profile deleted successfully' });
    } catch (error) {
        logger.error(`Error deleting profile: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route POST /profile/link
 * @description Links an OSRS username to a database profile. Requires JWT authentication.
 * @body { "uuid": "12345", "osrsName": "Zezima" } (uuid optional if JWT provided)
 */
router.post('/link', authenticateToken, async (req, res) => {
    try {
        let { uuid, osrsName } = req.body;
        if (!osrsName) {
            return res.status(400).json({ error: 'osrsName is required' });
        }
        if (!uuid && req.user?.uuid) {
            uuid = req.user.uuid;
        }
        if (!uuid) {
            return res.status(400).json({ error: 'uuid is required (or supply JWT with uuid)' });
        }

        const profile = await Profile.findOneAndUpdate(
            { uuid },
            { osrsName },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        logger.info(`Linked OSRS account "${osrsName}" to profile ${profile.username} (${uuid})`);
        res.status(200).json(profile);
    } catch (error) {
        logger.error(`Error linking profile: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route POST /profile/levels
 * @description Fetches OSRS levels for a linked profile.
 * @body { "uuid": "12345" }
 */
router.post('/levels', async (req, res) => {
    try {
        const { uuid } = req.body;
        if (!uuid) {
            return res.status(400).json({ error: 'uuid is required' });
        }

        const profile = await Profile.findOne({ uuid });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        if (!profile.osrsName) {
            return res.status(400).json({ error: 'No OSRS account linked to this profile' });
        }

        logger.debug(`Fetching OSRS levels for ${profile.osrsName} (${uuid})`);
        const { data: stats, cached, updatedAt } = await getCachedHiscores(profile.osrsName);

        if (!stats) {
            return res.status(404).json({ error: 'Player stats not found' });
        }

        // Extract levels and total level
        const levels = {};
        for (const [skillName, skillData] of Object.entries(stats.skills)) {
            levels[skillName] = skillData.level;
        }

        res.status(200).json({
            osrsName: profile.osrsName,
            levels: levels,
            totalLevel: stats.skills?.overall?.level || 'N/A',
            cached,
            updatedAt
        });
    } catch (error) {
        logger.error(`Error fetching levels for profile ${req.body.uuid}: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route POST /profile/ensure
 * @description Creates a profile if missing (by discordId) and returns JWT token. Also marks logged-in.
 * @body { "discordId": "123", "username": "Name" }
 */
router.post('/ensure', async (req, res) => {
    try {
        const { discordId, username } = req.body;
        if (!discordId || !username) {
            return res.status(400).json({ error: 'discordId and username are required' });
        }

        let profile = await Profile.findOne({ discordId });
        let created = false;
        if (!profile) {
            const uuid = crypto.randomUUID();
            profile = new Profile({ uuid, discordId, username, isLoggedIn: true, lastLogin: new Date() });
            await profile.save();
            created = true;
            logger.info(`Created new profile for discordId ${discordId} with uuid ${uuid}`);
        } else {
            // mark logged in
            profile.isLoggedIn = true;
            profile.lastLogin = new Date();
            // Optionally update username if changed
            if (username && username !== profile.username) profile.username = username;
            await profile.save();
        }

        const token = jwt.sign({ uuid: profile.uuid, username: profile.username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ profile, token, created });
    } catch (error) {
        logger.error(`Error ensuring profile: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route POST /profile/unlink
 * @description Unlinks OSRS username from the profile. Requires JWT.
 */
router.post('/unlink', authenticateToken, async (req, res) => {
    try {
        const uuid = req.user?.uuid || req.body?.uuid;
        if (!uuid) return res.status(400).json({ error: 'uuid is required (via JWT or body)' });

        const profile = await Profile.findOneAndUpdate(
            { uuid },
            { osrsName: null },
            { new: true }
        );
        if (!profile) return res.status(404).json({ error: 'Profile not found' });
        logger.info(`Unlinked OSRS account for profile ${uuid}`);
        res.status(200).json(profile);
    } catch (error) {
        logger.error(`Error unlinking profile: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
