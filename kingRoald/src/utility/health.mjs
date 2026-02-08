import mongoose from 'mongoose';
import { buildHealthReport, deriveLocalAiHealthUrl, deriveN8nHealthUrl } from './healthUtils.mjs';
import { AI_BASE_URL, BOB_URL, OLD_WISE_MAN_URL, PORT } from './loadedVariables.mjs';

/**
 * @description Builds a cluster health report for King Roald.
 */
export async function getClusterHealth() {
    const n8nHealthUrl = deriveN8nHealthUrl(process.env.N8N_WEBHOOK_URL || process.env.N8N_BASE_URL || 'http://n8n:5678');
    const localAiHealthUrl = deriveLocalAiHealthUrl(AI_BASE_URL || 'http://local-ai:8080');

    return buildHealthReport({
        serviceName: 'king-roald',
        version: process.env.npm_package_version,
        dependencies: [
            { name: 'bob', type: 'http', url: `${BOB_URL}/health`, timeoutMs: 5000 },
            { name: 'old-wise-man', type: 'http', url: `${OLD_WISE_MAN_URL}/health`, timeoutMs: 3000 },
            { name: 'n8n', type: 'http', url: n8nHealthUrl, timeoutMs: 3000, skipIfMissing: true },
            { name: 'local-ai', type: 'http', url: localAiHealthUrl, timeoutMs: 3000, skipIfMissing: true },
            {
                name: 'mongodb',
                checkFn: async () => {
                    const state = mongoose.connection.readyState;
                    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
                    if (state !== 1) {
                        throw new Error(`MongoDB is ${states[state] || 'unknown'}`);
                    }
                    return { state: states[state] };
                }
            }
        ],
        extras: {
            port: PORT,
            role: 'admin-bot'
        }
    });
}

export default {
    getClusterHealth
};
