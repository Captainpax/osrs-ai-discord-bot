/**
 * @module Logger
 * @description A basic logger system for Node.js using chalk for colorized output.
 * 
 * @example
 * import logger from './src/utility/logger.mjs';
 * 
 * logger.info('This is an info message');
 * logger.warn('This is a warning');
 * logger.error('This is an error');
 * 
 * // Debug messages only show if process.env.DEBUG === 'true'
 * logger.debug('This is a debug message');
 */

import chalk from "chalk";
import { DEBUG } from "./loadedVariables.mjs";

/**
 * @private
 * @description Color-coded log level prefixes.
 */
const levels = {
    INFO: chalk.blue("INFO"),
    WARN: chalk.yellow("WARN"),
    ERROR: chalk.red("ERROR"),
    DEBUG: chalk.magenta("DEBUG"),
};

/**
 * @private
 * @description Formats a log message with a timestamp and colorized level.
 * @param {string} level - The log level (e.g., 'INFO', 'WARN').
 * @param {string} message - The message to log.
 * @returns {string} The formatted log string.
 */
function formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${levels[level] || level}] ${message}`;
}

/**
 * @description Logger object providing methods for different log levels.
 */
const logger = {
    /**
     * @description Logs an informational message to stdout.
     * @param {string} message - The message to log.
     */
    info: (message) => console.log(formatMessage("INFO", message)),

    /**
     * @description Logs a warning message to stderr.
     * @param {string} message - The message to log.
     */
    warn: (message) => console.warn(formatMessage("WARN", message)),

    /**
     * @description Logs an error message to stderr.
     * @param {string} message - The message to log.
     */
    error: (message) => console.error(formatMessage("ERROR", message)),

    /**
     * @description Logs a debug message to stderr if the DEBUG environment variable is set to true.
     * @param {string} message - The message to log.
     */
    debug: (message) => {
        if (DEBUG) {
            console.debug(formatMessage("DEBUG", message));
        }
    },
};

export default logger;
