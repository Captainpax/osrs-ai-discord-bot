import axios from 'axios';
import logger from '../utility/logger.mjs';

/**
 * @module OSRSConnection
 * @description Handles connectivity checks to OSRS services.
 */

/**
 * @description Pings the OSRS Hiscores server to check for connectivity.
 * @returns {Promise<object>} Status object indicating if online.
 */
export async function pingOSRS() {
    try {
        logger.debug('Pinging OSRS Hiscores server...');
        // Using the hiscores main page as a health check target
        const response = await axios.get('https://services.runescape.com/m=hiscore_oldschool/overall.ws', { 
            timeout: 5000,
            headers: {
                'User-Agent': 'OldWiseMan-API'
            }
        });
        
        if (response.status === 200) {
            logger.debug('OSRS Hiscores server is reachable.');
            return { online: true, status: response.status };
        }
        
        logger.warn(`OSRS Hiscores returned status: ${response.status}`);
        return { online: false, status: response.status };
    } catch (error) {
        logger.error(`OSRS Ping failed: ${error.message}`);
        return { online: false, error: error.message };
    }
}
