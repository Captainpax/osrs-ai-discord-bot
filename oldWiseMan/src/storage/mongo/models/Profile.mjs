import mongoose from 'mongoose';

/**
 * @typedef {object} Profile
 * @property {string} uuid - Unique identifier for the user (e.g., Discord ID).
 * @property {string} username - The username chosen for the profile.
 * @property {string} [osrsName] - The linked OSRS in-game name.
 * @property {boolean} isLoggedIn - Whether the user is currently logged in.
 * @property {Date} createdAt - When the profile was created.
 * @property {Date} [lastLogin] - When the user last logged in.
 */

const profileSchema = new mongoose.Schema({
    uuid: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    discordId: {
        type: String,
        unique: true,
        index: true
    },
    username: { 
        type: String, 
        required: true 
    },
    osrsName: { 
        type: String, 
        default: null 
    },
    isLoggedIn: { 
        type: Boolean, 
        default: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    lastLogin: { 
        type: Date 
    },
    lastStats: {
        type: Object,
        default: null
    },
    weeklyStats: {
        type: Object,
        default: null
    },
    weeklyResetDate: {
        type: Date,
        default: null
    }
});

/**
 * @description Profile model for storing user information.
 */
const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
