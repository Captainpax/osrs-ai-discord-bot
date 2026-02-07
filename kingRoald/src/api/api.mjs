import express from 'express';
import logger from '../utility/logger.mjs';
import { getClusterHealth } from '../utility/health.mjs';

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
        const report = await getClusterHealth();
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
