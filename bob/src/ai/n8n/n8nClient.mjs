import axios from 'axios';
import { N8N_WEBHOOK_URL, N8N_API_KEY } from '../../utility/loadedVariables.mjs';
import logger from '../../utility/logger.mjs';

/**
 * @module AI/N8NClient
 * @description Provides functionality to communicate with n8n webhooks.
 */

/**
 * @description Sends a prompt to the configured n8n webhook.
 * @param {object} payload - The data to send to n8n.
 * @param {string} payload.prompt - The message content.
 * @param {string} payload.user - The user who sent the message.
 * @param {string} [payload.channelId] - The Discord channel ID.
 * @param {string} [payload.messageId] - The Discord message ID.
 * @returns {Promise<string|null>} The response from n8n or null if it failed.
 */
export async function askN8N(payload) {
    if (!N8N_WEBHOOK_URL) {
        logger.warn('N8N_WEBHOOK_URL is not configured.');
        return null;
    }

    try {
        logger.debug(`Sending prompt to n8n: "${payload.prompt}"`);
        
        const headers = {};
        if (N8N_API_KEY) {
            headers['X-N8N-API-KEY'] = N8N_API_KEY;
        }

        const response = await axios.post(N8N_WEBHOOK_URL, payload, {
            headers,
            timeout: 60000 // Increased to 60 seconds for slower AI generation
        });

        // Assuming n8n returns an object with a 'response' or 'output' field
        const data = response.data;
        logger.debug(`n8n response received: ${JSON.stringify(data)}`);
        
        if (typeof data === 'string') return data;
        return data.response || data.output || data.message || (typeof data === 'object' && Object.keys(data).length > 0 ? JSON.stringify(data) : null);
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            logger.error(`Error communicating with n8n: Timeout of 60s exceeded. AI might be taking too long.`);
        } else if (error.response?.status === 404) {
            logger.error(`Error communicating with n8n: 404 Not Found. Make sure the workflow is IMPORTED and ACTIVE at ${N8N_WEBHOOK_URL}`);
        } else {
            logger.error(`Error communicating with n8n: ${error.message}`);
        }
        
        if (error.response) {
            logger.debug(`n8n error response: ${JSON.stringify(error.response.data)}`);
        }
        return null;
    }
}

export default {
    askN8N
};
