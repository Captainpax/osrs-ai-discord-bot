import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { N8N_WEBHOOK_URL, N8N_API_KEY } = process.env;

async function testN8nSetup() {
    console.log('--- testing n8n Setup ---');
    console.log(`N8N_WEBHOOK_URL: ${N8N_WEBHOOK_URL}`);
    console.log(`N8N_API_KEY: ${N8N_API_KEY ? 'Set' : 'NOT SET'}`);

    if (!N8N_WEBHOOK_URL || !N8N_API_KEY) {
        console.error('Error: N8N_WEBHOOK_URL or N8N_API_KEY is missing from .env');
        process.exit(1);
    }

    const n8nBaseUrl = N8N_WEBHOOK_URL.split('/webhook/')[0];
    const apiUrl = `${n8nBaseUrl}/api/v1`;

    try {
        console.log(`Attempting to connect to n8n API at: ${apiUrl}`);
        const response = await axios.get(`${apiUrl}/workflows`, {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        });
        console.log('✅ Success: Connected to n8n API.');
        console.log(`Total workflows found: ${response.data.data?.length || 0}`);
        
        const workflows = response.data.data || [];
        const bobWorkflow = workflows.find(w => w.name === 'Bob Chat Workflow');
        if (bobWorkflow) {
            console.log(`✅ Success: "Bob Chat Workflow" found (ID: ${bobWorkflow.id}, Active: ${bobWorkflow.active})`);
        } else {
            console.log('⚠️ Warning: "Bob Chat Workflow" not found in n8n.');
        }
    } catch (error) {
        console.error('❌ Error connecting to n8n API:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

testN8nSetup();
