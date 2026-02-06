import app from './src/api/api.mjs';
import logger from './src/utility/logger.mjs';
import { connectDB, disconnectDB } from './src/storage/mongo/connection.mjs';
import { OLD_WISE_MAN_PORT } from './src/utility/loadedVariables.mjs';

let server;

/**
 * @description Main entry point for the oldWiseMan API.
 * Initializes the express server and starts listening on the specified port.
 */
async function init() {
    logger.info('Starting oldWiseMan API bootup...');

    try {
        // Initialize MongoDB connection
        await connectDB();

        server = app.listen(OLD_WISE_MAN_PORT, () => {
            logger.info(`Server is running on port ${OLD_WISE_MAN_PORT}`);
            logger.info('Clean boot sequence completed.');
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

/**
 * @description Gracefully shuts down the application.
 * @param {string} signal - The signal received (e.g., 'SIGINT', 'SIGTERM').
 */
async function gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);

    try {
        if (server) {
            logger.info('Closing HTTP server...');
            await new Promise((resolve) => server.close(resolve));
            logger.info('HTTP server closed.');
        }

        await disconnectDB();
        clearTimeout(shutdownTimeout);
        logger.info('Graceful shutdown completed.');
        process.exit(0);
    } catch (error) {
        logger.error(`Error during graceful shutdown: ${error.message}`);
        process.exit(1);
    }
}

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    // Attempt to disconnect before exiting
    disconnectDB().finally(() => process.exit(1));
});

init();
