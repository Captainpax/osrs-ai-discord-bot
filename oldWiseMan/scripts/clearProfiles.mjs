import { connectDB, disconnectDB } from '../src/storage/mongo/connection.mjs';
import Profile from '../src/storage/mongo/models/Profile.mjs';
import logger from '../src/utility/logger.mjs';

/**
 * @description Clears the entire profiles collection.
 * Usage: 
 *   node scripts/clearProfiles.mjs
 */
async function clearProfiles() {
    try {
        await connectDB();
        
        logger.info('Clearing all profile entries...');
        const result = await Profile.deleteMany({});
        
        logger.info(`Successfully deleted ${result.deletedCount} profile entries.`);
    } catch (error) {
        logger.error(`Error clearing profiles: ${error.message}`);
        process.exit(1);
    } finally {
        await disconnectDB();
    }
}

clearProfiles();
