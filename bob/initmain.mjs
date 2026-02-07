import { createClient, loginClient } from './src/discord/connection.mjs';
import { registerCommands } from './src/discord/commands.mjs';
import { setupInteractionHandler, setupMessageListener, handleAiResponse } from './src/discord/messageIO.mjs';
import { initScheduler, runLeaderboardUpdate } from './src/discord/scheduler.mjs';
import logger from './src/utility/logger.mjs';
import app from './src/api/api.mjs';
import { connectDB, disconnectDB } from './src/storage/mongo/connection.mjs';
import { PORT } from './src/utility/loadedVariables.mjs';
import { ensureWorkflowExists } from './src/ai/n8n/index.mjs';

let client;
let server;

/**
 * @description Main entry point for the Bob Discord Bot.
 * Initializes the bot, registers commands, and logs into Discord.
 */
async function main() {
    logger.info('Starting Bob Discord Bot bootup...');

    try {
        // Initialize MongoDB connection
        await connectDB();

        // Ensure n8n workflow exists
        await ensureWorkflowExists();

        // Register slash commands
        await registerCommands();

        // Create Discord client
        client = createClient();

        // Add admin routes that need the client
        app.post('/admin/push-leaderboard', async (req, res) => {
            try {
                logger.info('Manual leaderboard push triggered via API');
                await runLeaderboardUpdate(client);
                res.status(200).json({ message: 'Leaderboard push initiated' });
            } catch (err) {
                logger.error(`Error in manual leaderboard push: ${err.message}`);
                res.status(500).json({ error: 'Failed to push leaderboard' });
            }
        });

        // Add AI callback route
        app.post('/ai/callback', async (req, res) => {
            try {
                logger.debug(`AI Callback received: ${JSON.stringify(req.body)}`);
                await handleAiResponse(client, req.body);
                res.status(200).json({ status: 'received' });
            } catch (err) {
                logger.error(`Error in AI callback: ${err.message}`);
                res.status(500).json({ error: 'Internal server error during callback' });
            }
        });

        // Start REST API
        server = app.listen(PORT, () => {
            logger.info(`REST API is running on port ${PORT}`);
        });

        // Setup handlers
        setupInteractionHandler(client);
        setupMessageListener(client);

        // Login
        await loginClient(client);

        // Start periodic tasks
        initScheduler(client);

        logger.info('Clean boot sequence completed.');
    } catch (error) {
        logger.error(`Failed to start Bob: ${error.message}`);
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

        if (client) {
            logger.info('Destroying Discord client...');
            client.destroy();
            logger.info('Discord client destroyed.');
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
    // Attempt to cleanup before exiting
    if (client) {
        client.destroy();
    }
    disconnectDB().finally(() => process.exit(1));
});

main();