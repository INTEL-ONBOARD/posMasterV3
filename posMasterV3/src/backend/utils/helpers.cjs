/**
 * Utility Helpers
 *
 * Common utility functions for the backend.
 * Uses Node.js built-in modules to avoid ESM compatibility issues.
 */

const crypto = require('crypto');

/**
 * Generate a UUID v4
 * Uses Node's built-in crypto module
 * @returns {string} UUID string
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Hex-encoded token
 */
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Get current ISO timestamp
 * @returns {string} ISO timestamp
 */
function now() {
    return new Date().toISOString();
}

/**
 * Safe JSON parse with default value
 * @param {string} str - JSON string
 * @param {any} defaultValue - Default value if parse fails
 * @returns {any} Parsed value or default
 */
function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

module.exports = {
    generateUUID,
    generateToken,
    now,
    safeJsonParse
};
