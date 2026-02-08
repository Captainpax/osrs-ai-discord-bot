import axios from 'axios';
import { N8N_WEBHOOK_URL, N8N_API_KEY } from '../../utility/loadedVariables.mjs';
import logger from '../../utility/logger.mjs';
import { ensureWorkflowExists } from './setup.mjs';

const WORKFLOW_NAME = 'Bob Chat Workflow';
let cachedFallbackUrl = null;

async function resolveFallbackWebhookUrl() {
    if (!N8N_API_KEY || cachedFallbackUrl) return cachedFallbackUrl;

    const baseUrl = N8N_WEBHOOK_URL.split('/webhook/')[0];
    try {
        const response = await axios.get(`${baseUrl}/api/v1/workflows`, {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        });
        const workflows = response.data?.data || [];
        const match = workflows.find(w => w.name === WORKFLOW_NAME);
        if (!match?.id) return null;

        const path = N8N_WEBHOOK_URL.split('/webhook/')[1] || 'bob-prompt';
        cachedFallbackUrl = `${baseUrl}/webhook/${match.id}/webhook/${path}`;
        return cachedFallbackUrl;
    } catch (err) {
        logger.debug(`Failed to resolve fallback webhook URL: ${err.message}`);
        return null;
    }
}

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

    const headers = {};
    if (N8N_API_KEY) {
        headers['X-N8N-API-KEY'] = N8N_API_KEY;
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            const targetUrl = attempt === 3 && cachedFallbackUrl ? cachedFallbackUrl : N8N_WEBHOOK_URL;
            logger.debug(`Sending prompt to n8n (session ${payload.sessionId || 'n/a'}): "${payload.prompt}"`);

            const response = await axios.post(targetUrl, payload, {
                headers,
                timeout: 60000 // Increased to 60 seconds for slower AI generation
            });

            logger.debug(`n8n response received (session ${payload.sessionId || 'n/a'}): ${JSON.stringify(response.data)}`);
            return { ok: true, status: response.status, data: response.data };
        } catch (error) {
            const status = error.response?.status;
            if (error.code === 'ECONNABORTED') {
                logger.error(`Error communicating with n8n: Timeout of 60s exceeded. AI might be taking too long.`);
            } else if (status === 404) {
                logger.error(`Error communicating with n8n: 404 Not Found. Make sure the workflow is IMPORTED and ACTIVE at ${N8N_WEBHOOK_URL}`);
            } else {
                logger.error(`Error communicating with n8n: ${error.message}`);
            }

            if (error.response) {
                logger.debug(`n8n error response: ${JSON.stringify(error.response.data)}`);
            }

            if (status === 404 && attempt === 1 && N8N_API_KEY) {
                logger.warn('n8n webhook returned 404; attempting workflow re-sync then retrying...');
                await ensureWorkflowExists();
                continue;
            }

            if (status === 404 && attempt === 2 && N8N_API_KEY) {
                cachedFallbackUrl = await resolveFallbackWebhookUrl();
                if (cachedFallbackUrl) {
                    logger.warn(`Retrying n8n webhook via fallback URL: ${cachedFallbackUrl}`);
                    continue;
                }
            }

            return { ok: false, status, error: error.message, data: error.response?.data };
        }
    }
}

export default {
    askN8N
};
