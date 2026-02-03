import express from 'express';
import jwt from 'jsonwebtoken';
import { Hiscores } from 'oldschooljs';
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
        const { uuid, username } = req.body;
        if (!uuid || !username) {
            return res.status(400).json({ error: 'uuid and username are required' });
        }

        const existing = await Profile.findOne({ uuid });
        if (existing) {
            return res.status(409).json({ error: 'Profile already exists' });
        }

        const profile = new Profile({ uuid, username });
        await profile.save();

        logger.info(`Profile created for ${username} (${uuid})`);
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
        const { uuid } = req.body;
        if (!uuid) {
            return res.status(400).json({ error: 'uuid is required' });
        }

        const profile = await Profile.findOneAndUpdate(
            { uuid },
            { isLoggedIn: true, lastLogin: new Date() },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        logger.info(`User ${profile.username} (${uuid}) logged in`);
        
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
 * @body { "uuid": "12345", "osrsName": "Zezima" }
 */
router.post('/link', authenticateToken, async (req, res) => {
    try {
        const { uuid, osrsName } = req.body;
        if (!uuid || !osrsName) {
            return res.status(400).json({ error: 'uuid and osrsName are required' });
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
        const stats = await Hiscores.fetch(profile.osrsName);

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
            totalLevel: stats.skills.overall.level
        });
    } catch (error) {
        logger.error(`Error fetching levels for profile ${req.body.uuid}: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
