import mongoose from 'mongoose';

const cacheSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now,
        expires: 604800 // Auto-delete after 7 days (604800 seconds)
    }
});

/**
 * @description Cache model for storing temporary API results.
 */
const Cache = mongoose.model('Cache', cacheSchema);

export default Cache;
