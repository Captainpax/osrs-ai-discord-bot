import express from 'express';
import mongoose from 'mongoose';
import logger from '../utility/logger.mjs';
import { buildHealthReport, deriveLocalAiHealthUrl, deriveN8nHealthUrl } from '../utility/healthUtils.mjs';
import { AI_BASE_URL, OLD_WISE_MAN_URL, N8N_WEBHOOK_URL, PORT } from '../utility/loadedVariables.mjs';

const app = express();

app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
    if (req.url !== '/health' && req.url !== '/healthz') {
        logger.debug(`${req.method} ${req.url}`);
    }
    next();
});

/**
 * @description Public health check endpoint.
 * @route GET /health
 * @returns {object} 200 - Success message and timestamp.
 */
app.get('/health', async (req, res) => {
    try {
        const n8nHealthUrl = deriveN8nHealthUrl(N8N_WEBHOOK_URL);
        const localAiHealthUrl = deriveLocalAiHealthUrl(AI_BASE_URL || 'http://local-ai:8080');

        const report = await buildHealthReport({
            serviceName: 'bob',
            version: process.env.npm_package_version,
            dependencies: [
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
                role: 'discord-bot'
            }
        });

        res.status(report.status === 'UP' ? 200 : 503).json(report);
    } catch (err) {
        logger.error(`Health check failed: ${err.message}`);
        res.status(500).json({
            status: 'DOWN',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default app;
