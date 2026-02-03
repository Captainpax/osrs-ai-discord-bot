import express from 'express';
import ServerSettings from '../../storage/mongo/models/ServerSettings.mjs';
import logger from '../../utility/logger.mjs';

const router = express.Router();

/**
 * @route POST /settings/server
 * @description Creates or updates server settings for a guild.
 * @body { "guildId": "987654321", "prefix": "!", "settings": { "welcomeChannel": "123" } }
 */
router.post('/server', async (req, res) => {
    try {
        const { guildId, prefix, settings } = req.body;
        if (!guildId) {
            return res.status(400).json({ error: 'guildId is required' });
        }

        const updatedSettings = await ServerSettings.findOneAndUpdate(
            { guildId },
            { 
                $set: { 
                    prefix: prefix || '!', 
                    settings: settings || {},
                    updatedAt: new Date()
                } 
            },
            { upsert: true, new: true }
        );

        logger.info(`Server settings updated for guild ${guildId}`);
        res.status(200).json(updatedSettings);
    } catch (error) {
        logger.error(`Error updating server settings: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route GET /settings/server/:guildId
 * @description Retrieves server settings for a guild.
 */
router.get('/server/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        const settings = await ServerSettings.findOne({ guildId });

        if (!settings) {
            return res.status(404).json({ error: 'Settings not found for this guild' });
        }

        res.status(200).json(settings);
    } catch (error) {
        logger.error(`Error fetching server settings: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
