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

        const allWorkflows = response.data.data || [];
        
        // Find workflows named "Bob Chat Workflow"
        const matchingByName = allWorkflows.filter(w => w.name === 'Bob Chat Workflow');
        
        // We also want to find ANY workflow that might be using the 'bob-prompt' webhook path
        // to prevent 404s and conflicts.
        const conflictingWorkflows = [];
        
        logger.info(`Checking ${allWorkflows.length} workflows for webhook path conflicts...`);
        for (const w of allWorkflows) {
            // If it's one we already found by name, we'll handle it below
            if (matchingByName.some(m => m.id === w.id)) continue;
            
            // Fetch full workflow details to check nodes
            try {
                const fullW = await axios.get(`${apiUrl}/workflows/${w.id}`, { headers });
                const nodes = fullW.data.nodes || [];
                const hasConflictingWebhook = nodes.some(n => 
                    n.type === 'n8n-nodes-base.webhook' && 
                    n.parameters?.path === 'bob-prompt'
                );
                
                if (hasConflictingWebhook) {
                    logger.warn(`Found conflicting workflow "${w.name}" (ID: ${w.id}) using path "bob-prompt".`);
                    conflictingWorkflows.push(w);
                }
            } catch (err) {
                logger.debug(`Could not fetch details for workflow ${w.id}: ${err.message}`);
            }
        }

        const workflowsToDeactivate = [...matchingByName, ...conflictingWorkflows];
        
        // Deactivate all matching/conflicting workflows first to prevent webhook conflicts during activation
        for (const w of workflowsToDeactivate) {
            if (w.active) {
                logger.info(`Deactivating workflow "${w.name}" (ID: ${w.id}) to resolve potential conflicts...`);
                try {
                    await axios.post(`${apiUrl}/workflows/${w.id}/deactivate`, {}, { headers });
                } catch (err) {
                    logger.warn(`Failed to deactivate workflow ${w.id}: ${err.message}`);
                }
            }
        }

        // Identify the primary workflow to update (prefer one that was named correctly)
        let existing = matchingByName.find(w => w.active) || matchingByName[0];

        // Clean up duplicates and conflicts
        for (const w of workflowsToDeactivate) {
            if (existing && w.id === existing.id) continue;
            
            // If we don't have an 'existing' yet, take the first one
            if (!existing) {
                existing = w;
                continue;
            }

            try {
                logger.info(`Deleting redundant/conflicting workflow "${w.name}" (ID: ${w.id})...`);
                await axios.delete(`${apiUrl}/workflows/${w.id}`, { headers });
            } catch (err) {
                logger.warn(`Failed to delete workflow ${w.id}: ${err.message}`);
            }
        }
        
        const workflowPath = path.join(__dirname, 'workflow.json');
        let workflowData;
        try {
            const fileContent = await fs.readFile(workflowPath, 'utf8');
            // Prefill environment variables before parsing
            const prefilledContent = prefillWorkflow(fileContent);
            workflowData = JSON.parse(prefilledContent);
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
            logger.info(`n8n workflow "Bob Chat Workflow" already exists (ID: ${existing.id}). Updating to latest version...`);
            await axios.put(`${apiUrl}/workflows/${existing.id}`, workflowPayload, { headers });
            logger.info('Successfully updated n8n workflow.');
            
            logger.info('Activating "Bob Chat Workflow"...');
            try {
                await axios.post(`${apiUrl}/workflows/${existing.id}/activate`, {}, { headers });
                logger.info('Successfully activated workflow.');
            } catch (actErr) {
                if (actErr.response?.data?.message?.includes('conflict')) {
                    logger.error('CRITICAL: Webhook conflict detected during activation. Another workflow may be using the "bob-prompt" path. Please check n8n and deactivate any conflicting workflows.');
                } else {
                    throw actErr;
                }
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
        try {
            await axios.post(`${apiUrl}/workflows/${newWorkflow.id}/activate`, {}, { headers });
            logger.info('Successfully activated workflow.');
        } catch (actErr) {
            if (actErr.response?.data?.message?.includes('conflict')) {
                logger.error('CRITICAL: Webhook conflict detected during activation of NEW workflow. Another workflow may be using the "bob-prompt" path. Please check n8n.');
            } else {
                throw actErr;
            }
        }

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

/**
 * @description Replaces n8n-style environment variable placeholders with actual values.
 * e.g., "={{ $env.AI_MODEL || 'gpt-4' }}" -> "gpt-4" (or process.env.AI_MODEL)
 * @param {string} content - The JSON string content of the workflow.
 * @returns {string} The processed content.
 */
function prefillWorkflow(content) {
    // Regex matches {{ $env.VAR_NAME || 'DEFAULT' }} or {{ $env.VAR_NAME }}
    return content.replace(/\{\{\s*\$env\.([A-Z0-9_]+)\s*(?:\|\|\s*'([^']*)')?\s*\}\}/g, (match, varName, defaultValue) => {
        const value = process.env[varName] || defaultValue || '';
        logger.debug(`Prefilling workflow var ${varName} with "${value}"`);
        return value;
    });
}

export default {
    ensureWorkflowExists
};
