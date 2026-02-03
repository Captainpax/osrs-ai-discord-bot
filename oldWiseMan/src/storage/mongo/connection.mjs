import mongoose from 'mongoose';
import logger from '../../utility/logger.mjs';
import { MONGODB_URI } from '../../utility/loadedVariables.mjs';

/**
 * @module MongoDBConnection
 * @description Handles MongoDB connection and disconnection using Mongoose.
 */

/**
 * @description Connects to MongoDB using Mongoose.
 * @returns {Promise<void>}
 */
export async function connectDB() {
    try {
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        logger.info('Successfully connected to MongoDB.');
    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        throw error;
    }
}

/**
 * @description Disconnects from MongoDB.
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
    try {
        logger.info('Disconnecting from MongoDB...');
        await mongoose.disconnect();
        logger.info('Successfully disconnected from MongoDB.');
    } catch (error) {
        logger.error(`Error disconnecting from MongoDB: ${error.message}`);
    }
}

// Event listeners for mongoose connection
mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
});
