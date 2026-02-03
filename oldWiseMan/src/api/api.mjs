import express from 'express';
import logger from '../utility/logger.mjs';
import profileRoutes from './routes/profile.mjs';
import osrsRoutes from './routes/osrs.mjs';
import settingsRoutes from './routes/settings.mjs';

const app = express();

app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
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
app.get('/health', (req, res) => {
    logger.info('Health check requested');
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        message: 'Wise Man is healthy'
    });
});

export default app;