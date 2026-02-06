import express from 'express';
import logger from '../utility/logger.mjs';

const app = express();

app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
});

/**
 * @description Public health check endpoint.
 * @route GET /health
 * @returns {object} 200 - Success message and timestamp.
 */
app.get('/health', (req, res) => {
    logger.info('Health check requested');
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        message: 'Bob is healthy'
    });
});

export default app;
