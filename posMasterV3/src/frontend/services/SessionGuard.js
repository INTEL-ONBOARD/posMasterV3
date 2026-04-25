/**
 * Session Guard Service
 *
 * Provides session validation for every API operation.
 * Emits events when session becomes invalid or is kicked.
 */

// Session state
let sessionValid = true;
let lastValidationTime = 0;
const VALIDATION_THROTTLE = 1000; // Don't validate more than once per 1 second (faster for real-time)

// Event listeners
const sessionListeners = new Set();

/**
 * Subscribe to session events
 * @param {Function} callback - Called with { type: 'kicked' | 'invalid', message: string }
 */
export function onSessionEvent(callback) {
    sessionListeners.add(callback);
    return () => sessionListeners.delete(callback);
}

/**
 * Emit session event to all listeners
 */
function emitSessionEvent(event) {
    sessionListeners.forEach(callback => {
        try {
            callback(event);
        } catch (e) {
            console.error('[SessionGuard] Listener error:', e);
        }
    });
}

/**
 * Mark session as invalid
 */
export function invalidateSession() {
    sessionValid = false;
}

/**
 * Check if session is currently valid
 */
export function isSessionValid() {
    return sessionValid;
}

/**
 * Validate session (fast, with caching)
 * @returns {Promise<{valid: boolean, forcedLogout?: boolean, message?: string}>}
 */
export async function validateSession() {
    const token = sessionStorage.getItem('token');
    if (!token) {
        return { valid: false, message: 'No token' };
    }

    // Throttle validation calls
    const now = Date.now();
    if (now - lastValidationTime < VALIDATION_THROTTLE && sessionValid) {
        return { valid: true };
    }
    lastValidationTime = now;

    try {
        const response = await window.electronAPI?.online?.validateSession?.();
        const result = {
            valid: response?.status === 'success' && response?.data?.valid !== false,
            ...(response?.data || {})
        };
        sessionValid = result.valid;

        if (!result.valid) {
            if (result.forcedLogout) {
                emitSessionEvent({
                    type: 'kicked',
                    message: result.message || 'Logged in from another device',
                    otherDevice: result.otherDevice
                });
            } else {
                emitSessionEvent({
                    type: 'invalid',
                    message: result.message || 'Session expired'
                });
            }
        }

        return result;
    } catch (error) {
        console.error('[SessionGuard] Validation error:', error);
        return { valid: false, message: 'Validation failed' };
    }
}

/**
 * Wrap an API call with session validation
 * If session is invalid, returns error response and emits event
 * @param {Function} apiCall - The API function to call
 * @returns {Function} Wrapped function
 */
export function withSessionGuard(apiCall) {
    return async (...args) => {
        // Validate session first
        const validation = await validateSession();

        if (!validation.valid) {
            return {
                status: 'error',
                success: false,
                message: validation.message || 'Session invalid',
                sessionInvalid: true,
                forcedLogout: validation.forcedLogout
            };
        }

        // Call the actual API
        try {
            const result = await apiCall(...args);

            // Check if the response indicates session issues
            if (result?.status === 'session_invalid' || result?.requiresReauth) {
                sessionValid = false;
                emitSessionEvent({
                    type: result.forcedLogout ? 'kicked' : 'invalid',
                    message: result.message || 'Session invalid'
                });
            }

            return result;
        } catch (error) {
            console.error('[SessionGuard] API call error:', error);
            throw error;
        }
    };
}

/**
 * Create a guarded API object
 * Wraps all methods of an API object with session validation
 * @param {Object} api - API object with async methods
 * @returns {Object} Guarded API object
 */
export function createGuardedApi(api) {
    const guarded = {};

    for (const [key, value] of Object.entries(api)) {
        if (typeof value === 'function') {
            guarded[key] = withSessionGuard(value);
        } else {
            guarded[key] = value;
        }
    }

    return guarded;
}

/**
 * Start real-time session monitoring
 * Checks session periodically and on visibility change
 * @param {number} interval - Check interval in ms (default 10000)
 * @returns {Function} Stop function
 */
export function startSessionMonitor(interval = 10000) {
    let checkInterval = null;
    let isMonitoring = true;

    const check = async () => {
        if (!isMonitoring) return;

        const token = sessionStorage.getItem('token');
        if (!token) return;

        try {
            if (window.electronAPI?.online?.validateSession) {
                const response = await window.electronAPI.online.validateSession();
                const result = {
                    valid: response?.status === 'success' && response?.data?.valid !== false,
                    ...(response?.data || {})
                };

                if (!result.valid) {
                    sessionValid = false;
                    emitSessionEvent({
                        type: result.forcedLogout ? 'kicked' : 'invalid',
                        message: result.message || 'Session invalid'
                    });
                }
            }
        } catch (error) {
            console.error('[SessionGuard] Monitor check error:', error);
        }
    };

    // Check on visibility change (when user returns to tab/app)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            check();
        }
    };

    // Check on focus
    const handleFocus = () => {
        check();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Start interval
    checkInterval = setInterval(check, interval);

    // Initial check
    setTimeout(check, 100);

    // Return stop function
    return () => {
        isMonitoring = false;
        if (checkInterval) {
            clearInterval(checkInterval);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
    };
}

export default {
    onSessionEvent,
    validateSession,
    withSessionGuard,
    createGuardedApi,
    startSessionMonitor,
    invalidateSession,
    isSessionValid
};
