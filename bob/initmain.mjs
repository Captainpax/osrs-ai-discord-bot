import { createClient, loginClient } from './src/discord/connection.mjs';
import { registerCommands } from './src/discord/commands.mjs';
import { setupInteractionHandler, setupMessageListener } from './src/discord/messageIO.mjs';
import logger from './src/utility/logger.mjs';

let client;

/**
 * @description Main entry point for the Bob Discord Bot.
 * Initializes the bot, registers commands, and logs into Discord.
 */
async function main() {
    logger.info('Starting Bob Discord Bot bootup...');

    try {
        // Register slash commands
        await registerCommands();

        // Create Discord client
        client = createClient();

        // Setup handlers
        setupInteractionHandler(client);
        setupMessageListener(client);

        // Login
        await loginClient(client);

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
        if (client) {
            logger.info('Destroying Discord client...');
            client.destroy();
            logger.info('Discord client destroyed.');
        }

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
    process.exit(1);
});

main();