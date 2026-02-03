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
    const startTime = Date.now();
    try {
        logger.debug('Pinging OSRS Hiscores server...');
        // Using the hiscores main page as a health check target
        const response = await axios.get('https://services.runescape.com/m=hiscore_oldschool/overall.ws', { 
            timeout: 5000,
            headers: {
                'User-Agent': 'OldWiseMan-API'
            }
        });
        
        const latency = Date.now() - startTime;
        
        if (response.status === 200) {
            logger.debug(`OSRS Hiscores server is reachable (${latency}ms).`);
            return { online: true, status: response.status, latency: `${latency}ms` };
        }
        
        logger.warn(`OSRS Hiscores returned status: ${response.status}`);
        return { online: false, status: response.status, latency: `${latency}ms` };
    } catch (error) {
        const latency = Date.now() - startTime;
        logger.error(`OSRS Ping failed after ${latency}ms: ${error.message}`);
        return { online: false, error: error.message, latency: `${latency}ms` };
    }
}
