import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utility/loadedVariables.mjs';
import logger from '../utility/logger.mjs';
import Profile from '../storage/mongo/models/Profile.mjs';

/**
 * @description Middleware to authenticate JWT token and ensure user is logged in.
 * Checks for a token in the Authorization header (Bearer token).
 */
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logger.warn(`Unauthorized access attempt to ${req.url}: No token provided`);
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        // Check if the user is still marked as logged in in the DB
        if (decoded.uuid) {
            const profile = await Profile.findOne({ uuid: decoded.uuid });
            if (!profile || !profile.isLoggedIn) {
                logger.warn(`Unauthorized access attempt by ${decoded.uuid}: User not logged in in database`);
                return res.status(401).json({ error: 'User is not logged in.' });
            }
        }

        next();
    } catch (error) {
        logger.error(`Invalid token for access to ${req.url}: ${error.message}`);
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};
