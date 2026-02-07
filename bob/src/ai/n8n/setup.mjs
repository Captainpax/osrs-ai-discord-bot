import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { N8N_WEBHOOK_URL, N8N_API_KEY } from '../../utility/loadedVariables.mjs';
import logger from '../../utility/logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @module AI/N8NSetup
 * @description Automatically sets up the n8n workflow for Bob if it doesn't exist.
 */

/**
 * @description Ensures the Bob Chat Workflow is present and active in n8n.
 * Uses the n8n public API to check, create, and activate the workflow.
 * @returns {Promise<void>}
 */
export async function ensureWorkflowExists() {
    if (!N8N_WEBHOOK_URL || !N8N_API_KEY) {
        logger.warn('N8N_WEBHOOK_URL or N8N_API_KEY not configured, skipping n8n workflow setup.');
        return;
    }

    // Derive the API base URL from the webhook URL
    // e.g., http://n8n:5678/webhook/bob-prompt -> http://n8n:5678
    const n8nBaseUrl = N8N_WEBHOOK_URL.split('/webhook/')[0];
    const apiUrl = `${n8nBaseUrl}/api/v1`;

    try {
        const headers = { 'X-N8N-API-KEY': N8N_API_KEY };

        // 1. Test API key and check if workflow exists
        logger.info('Testing n8n API key...');
        const response = await axios.get(`${apiUrl}/workflows`, { headers });
        logger.info('n8n API key validated successfully.');

        const workflows = response.data.data || [];
        logger.info('Checking if "Bob Chat Workflow" exists in n8n...');
        
        const existing = workflows.find(w => w.name === 'Bob Chat Workflow');
        
        const workflowPath = path.join(__dirname, 'workflow.json');
        let workflowData;
        try {
            const fileContent = await fs.readFile(workflowPath, 'utf8');
            workflowData = JSON.parse(fileContent);
        } catch (fileError) {
            logger.error(`Could not read workflow file at ${workflowPath}: ${fileError.message}`);
            return;
        }

        // Prepare payload (active is read-only for create, but can be set for update in some API versions, 
        // but better to use activation endpoint)
        const workflowPayload = {
            name: workflowData.name,
            nodes: workflowData.nodes,
            connections: workflowData.connections,
            settings: workflowData.settings
        };

        if (existing) {
            logger.info('n8n workflow "Bob Chat Workflow" already exists. Updating to latest version...');
            await axios.put(`${apiUrl}/workflows/${existing.id}`, workflowPayload, { headers });
            logger.info('Successfully updated n8n workflow.');
            
            if (!existing.active) {
                logger.info('Activating "Bob Chat Workflow"...');
                await axios.post(`${apiUrl}/workflows/${existing.id}/activate`, {}, { headers });
                logger.info('Successfully activated workflow.');
            }
            return;
        }

        // 2. Create workflow if missing
        logger.info('n8n workflow missing. Attempting to import...');
        const createResponse = await axios.post(`${apiUrl}/workflows`, workflowPayload, { headers });
        const newWorkflow = createResponse.data;
        logger.info(`Successfully imported n8n workflow (ID: ${newWorkflow.id}).`);

        // 3. Activate the new workflow
        logger.info('Activating "Bob Chat Workflow"...');
        await axios.post(`${apiUrl}/workflows/${newWorkflow.id}/activate`, {}, { headers });
        logger.info('Successfully activated workflow.');

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            logger.error(`Could not connect to n8n API at ${apiUrl}. Is n8n running?`);
        } else {
            logger.error(`Error during n8n setup: ${error.message}`);
            if (error.response) {
                logger.debug(`n8n API error response: ${JSON.stringify(error.response.data)}`);
            }
        }
    }
}

export default {
    ensureWorkflowExists
};
