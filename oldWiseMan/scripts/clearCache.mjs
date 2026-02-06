import { connectDB, disconnectDB } from '../src/storage/mongo/connection.mjs';
import Cache from '../src/storage/mongo/models/Cache.mjs';
import logger from '../src/utility/logger.mjs';

/**
 * @description Clears the entire cache collection or specific entries.
 * Usage: 
 *   node scripts/clearCache.mjs (clears all)
 *   node scripts/clearCache.mjs <key_prefix> (clears keys starting with prefix)
 */
async function clearCache() {
    const prefix = process.argv[2];
    
    try {
        await connectDB();
        
        let result;
        if (prefix) {
            logger.info(`Clearing cache entries with prefix: "${prefix}"`);
            result = await Cache.deleteMany({ key: { $regex: `^${prefix}` } });
        } else {
            logger.info('Clearing all cache entries...');
            result = await Cache.deleteMany({});
        }
        
        logger.info(`Successfully deleted ${result.deletedCount} cache entries.`);
    } catch (error) {
        logger.error(`Error clearing cache: ${error.message}`);
        process.exit(1);
    } finally {
        await disconnectDB();
    }
}

clearCache();
