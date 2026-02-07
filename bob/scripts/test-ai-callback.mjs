import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const port = process.env.BOB_PORT || 8889;
const url = `http://localhost:${port}/ai/callback`;

async function testAiCallback() {
    console.log('--- testing Bob AI Callback ---');
    console.log(`Target URL: ${url}`);

    const payload = {
        response: "This is a test AI response from n8n!",
        channelId: "test-channel",
        statusMessageId: "test-msg-id",
        user: "Tester"
    };

    try {
        const response = await axios.post(url, payload);
        console.log('✅ Success: Callback sent to Bob.');
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
    } catch (error) {
        console.error('❌ Error sending callback:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
        console.log('\nHint: Is Bob running locally? (Check BOB_PORT in .env)');
    }
}

testAiCallback();
