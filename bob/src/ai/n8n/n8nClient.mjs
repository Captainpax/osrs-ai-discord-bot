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
 * @returns {Promise<{ ok: boolean, status?: number, data?: any, error?: string }>} The response info from n8n.
 */
export async function askN8N(payload) {
    if (!N8N_WEBHOOK_URL) {
        logger.warn('N8N_WEBHOOK_URL is not configured.');
        return { ok: false, error: 'N8N_WEBHOOK_URL is not configured.' };
    }

    try {
        logger.debug(`Sending prompt to n8n (session ${payload.sessionId || 'n/a'}): "${payload.prompt}"`);
        
        const headers = {};
        if (N8N_API_KEY) {
            headers['X-N8N-API-KEY'] = N8N_API_KEY;
        }

        const response = await axios.post(N8N_WEBHOOK_URL, payload, {
            headers,
            timeout: 60000 // Increased to 60 seconds for slower AI generation
        });

        logger.debug(`n8n response received (session ${payload.sessionId || 'n/a'}): ${JSON.stringify(response.data)}`);
        return { ok: true, status: response.status, data: response.data };
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
        return { ok: false, status: error.response?.status, error: error.message, data: error.response?.data };
    }
}

export default {
    askN8N
};
