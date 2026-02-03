import mongoose from 'mongoose';

/**
 * @typedef {object} ServerSettings
 * @property {string} guildId - Unique identifier for the Discord guild/server.
 * @property {string} prefix - Command prefix for this server.
 * @property {Map<string, string>} settings - Generic settings map.
 * @property {Date} updatedAt - Last time settings were updated.
 */

const serverSettingsSchema = new mongoose.Schema({
    guildId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    prefix: { 
        type: String, 
        default: '!' 
    },
    settings: { 
        type: Map, 
        of: String, 
        default: {} 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

serverSettingsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

/**
 * @description ServerSettings model for storing per-guild configuration.
 */
const ServerSettings = mongoose.model('ServerSettings', serverSettingsSchema);

export default ServerSettings;
