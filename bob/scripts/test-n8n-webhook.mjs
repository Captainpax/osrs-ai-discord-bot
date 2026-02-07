import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { N8N_WEBHOOK_URL, N8N_API_KEY } = process.env;

async function testN8nWebhook() {
    console.log('--- testing n8n Webhook ---');
    console.log(`URL: ${N8N_WEBHOOK_URL}`);

    if (!N8N_WEBHOOK_URL) {
        console.error('Error: N8N_WEBHOOK_URL is missing from .env');
        process.exit(1);
    }

    // Try to use localhost if running outside Docker
    const localUrl = N8N_WEBHOOK_URL.replace('http://n8n:', 'http://localhost:');

    const payload = {
        prompt: "Hello, this is a test prompt.",
        user: "Tester",
        userId: "123",
        channelId: "test-channel",
        messageId: "test-msg-id",
        statusMessageId: "test-status-id"
    };

    try {
        console.log(`Sending payload to: ${localUrl}`);
        const response = await axios.post(localUrl, payload, {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        });
        console.log('✅ Success: Webhook received by n8n.');
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
    } catch (error) {
        console.error('❌ Error sending to n8n webhook:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
        console.log('\nHint: If you are running locally, make sure you can reach the n8n port.');
    }
}

testN8nWebhook();
