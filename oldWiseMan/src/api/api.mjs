import express from 'express';
import mongoose from 'mongoose';
import logger from '../utility/logger.mjs';
import profileRoutes from './routes/profile.mjs';
import osrsRoutes from './routes/osrs.mjs';
import settingsRoutes from './routes/settings.mjs';
import { buildHealthReport } from '../utility/healthUtils.mjs';
import { pingOSRS } from '../osrs/connection.mjs';
import { OLD_WISE_MAN_PORT } from '../utility/loadedVariables.mjs';

const app = express();

app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
    if (req.url !== '/health' && req.url !== '/healthz') {
        logger.debug(`${req.method} ${req.url}`);
    }
    next();
});

// Routes
app.use('/profile', profileRoutes);
app.use('/osrs', osrsRoutes);
app.use('/settings', settingsRoutes);

/**
 * @description Public health check endpoint.
 * @route GET /health
 * @returns {object} 200 - Success message and timestamp.
 */
app.get('/health', async (req, res) => {
    try {
        const report = await buildHealthReport({
            serviceName: 'old-wise-man',
            version: process.env.npm_package_version,
            dependencies: [
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
                },
                {
                    name: 'osrs-hiscores',
                    checkFn: pingOSRS,
                    statusFromResult: (res) => res?.online ? 'UP' : 'DOWN'
                }
            ],
            extras: {
                port: OLD_WISE_MAN_PORT,
                role: 'api'
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
