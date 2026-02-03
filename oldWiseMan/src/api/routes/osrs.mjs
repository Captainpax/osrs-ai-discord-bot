import express from 'express';
import { Hiscores } from 'oldschooljs';
import logger from '../../utility/logger.mjs';
import { pingOSRS } from '../../osrs/connection.mjs';

const router = express.Router();

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
 * @route GET /osrs/stats/:username
 * @description Fetches OSRS stats for a given username using oldschooljs.
 */
router.get('/stats/:username', async (req, res) => {
    try {
        const { username } = req.params;
        logger.debug(`Fetching OSRS stats for ${username}`);
        const stats = await Hiscores.fetch(username);
        
        if (!stats) {
            return res.status(404).json({ error: 'Player not found or no stats available' });
        }
        
        res.status(200).json(stats);
    } catch (error) {
        logger.error(`Error fetching stats for ${req.params.username}: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch OSRS stats from Hiscores' });
    }
});

export default router;
