/**
 * Utility Helpers
 *
 * Common utility functions for the backend.
 * Uses Node.js built-in modules to avoid ESM compatibility issues.
 */

const crypto = require('crypto');
const { createLogger } = require('../../online-server/utils/logger.cjs');
const ipcLogger = createLogger('IPC');

// Sri Lanka timezone offset: UTC+5:30
const SRI_LANKA_OFFSET_HOURS = 5;
const SRI_LANKA_OFFSET_MINUTES = 30;
const SRI_LANKA_TIMEZONE = 'Asia/Colombo';

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
 * Get current date in Sri Lankan timezone
 * @returns {Date} Date object adjusted for Sri Lanka
 */
function getSriLankanDate() {
    const now = new Date();
    // Get UTC time and add Sri Lanka offset
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const sriLankaTime = new Date(utcTime + (SRI_LANKA_OFFSET_HOURS * 3600000) + (SRI_LANKA_OFFSET_MINUTES * 60000));
    return sriLankaTime;
}

/**
 * Get current ISO timestamp in Sri Lankan timezone
 * Format: YYYY-MM-DDTHH:mm:ss.sss+05:30
 * @returns {string} ISO timestamp with Sri Lanka timezone
 */
function now() {
    const sriLankaDate = getSriLankanDate();

    const year = sriLankaDate.getFullYear();
    const month = String(sriLankaDate.getMonth() + 1).padStart(2, '0');
    const day = String(sriLankaDate.getDate()).padStart(2, '0');
    const hours = String(sriLankaDate.getHours()).padStart(2, '0');
    const minutes = String(sriLankaDate.getMinutes()).padStart(2, '0');
    const seconds = String(sriLankaDate.getSeconds()).padStart(2, '0');
    const ms = String(sriLankaDate.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+05:30`;
}

/**
 * Get current ISO timestamp in Sri Lankan timezone (UTC format for database storage)
 * This stores the Sri Lankan local time but in ISO format
 * @returns {string} ISO timestamp
 */
function nowISO() {
    const sriLankaDate = getSriLankanDate();

    const year = sriLankaDate.getFullYear();
    const month = String(sriLankaDate.getMonth() + 1).padStart(2, '0');
    const day = String(sriLankaDate.getDate()).padStart(2, '0');
    const hours = String(sriLankaDate.getHours()).padStart(2, '0');
    const minutes = String(sriLankaDate.getMinutes()).padStart(2, '0');
    const seconds = String(sriLankaDate.getSeconds()).padStart(2, '0');
    const ms = String(sriLankaDate.getMilliseconds()).padStart(3, '0');

    // Return in ISO format but with Sri Lankan local time values
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}Z`;
}

/**
 * Get current date string in Sri Lankan timezone (YYYY-MM-DD)
 * @returns {string} Date string
 */
function today() {
    const sriLankaDate = getSriLankanDate();

    const year = sriLankaDate.getFullYear();
    const month = String(sriLankaDate.getMonth() + 1).padStart(2, '0');
    const day = String(sriLankaDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Get current time string in Sri Lankan timezone (HH:mm:ss)
 * @returns {string} Time string
 */
function currentTime() {
    const sriLankaDate = getSriLankanDate();

    const hours = String(sriLankaDate.getHours()).padStart(2, '0');
    const minutes = String(sriLankaDate.getMinutes()).padStart(2, '0');
    const seconds = String(sriLankaDate.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Convert a UTC date to Sri Lankan timezone
 * @param {Date|string} date - Date to convert
 * @returns {Date} Date in Sri Lankan timezone
 */
function toSriLankanTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utcTime + (SRI_LANKA_OFFSET_HOURS * 3600000) + (SRI_LANKA_OFFSET_MINUTES * 60000));
}

/**
 * Format a date to Sri Lankan local format
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
function formatSriLankanDate(date, options = {}) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const defaultOptions = {
        timeZone: SRI_LANKA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    return new Intl.DateTimeFormat('en-GB', { ...defaultOptions, ...options }).format(d);
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

/**
 * Wrap an IPC handler with consistent error handling
 * Returns { status: 'error', message: string } for any uncaught errors
 * @param {Function} handler - The async handler function
 * @returns {Function} Wrapped handler with error handling
 */
function wrapIpcHandler(handler) {
    return async (...args) => {
        try {
            return await handler(...args);
        } catch (error) {
            ipcLogger.error(error.message || 'An unexpected error occurred', { stack: error.stack });
            return {
                status: 'error',
                message: error.message || 'An unexpected error occurred'
            };
        }
    };
}

/**
 * Create a standardized success response
 * @param {any} data - The response data
 * @param {string} message - Optional success message
 * @returns {Object} Standardized success response
 */
function successResponse(data, message = null) {
    const response = { status: 'success', data };
    if (message) response.message = message;
    return response;
}

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {string} code - Optional error code
 * @returns {Object} Standardized error response
 */
function errorResponse(message, code = null) {
    const response = { status: 'error', message };
    if (code) response.code = code;
    return response;
}

module.exports = {
    generateUUID,
    generateToken,
    now,
    nowISO,
    today,
    currentTime,
    getSriLankanDate,
    toSriLankanTime,
    formatSriLankanDate,
    safeJsonParse,
    wrapIpcHandler,
    successResponse,
    errorResponse,
    SRI_LANKA_TIMEZONE,
    SRI_LANKA_OFFSET_HOURS,
    SRI_LANKA_OFFSET_MINUTES
};
