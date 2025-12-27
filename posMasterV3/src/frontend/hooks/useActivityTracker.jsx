/**
 * Activity Tracker Hook
 *
 * Tracks user activity and resets the auto-logout timer.
 * Also listens for auto-logout events from the backend.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { appSettingsApi, authApi } from '../api/localApi';

/**
 * Hook to track user activity and handle auto-logout
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether tracking is enabled
 * @param {number} options.debounceMs - Debounce time for activity events (default 1000ms)
 */
export function useActivityTracker({ enabled = true, debounceMs = 1000 } = {}) {
    const navigate = useNavigate();
    const lastActivityRef = useRef(Date.now());
    const debounceTimerRef = useRef(null);

    // Reset activity timer (debounced)
    const resetActivity = useCallback(() => {
        if (!enabled) return;

        // Debounce to avoid too many IPC calls
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
            try {
                await appSettingsApi.resetActivity();
                lastActivityRef.current = Date.now();
            } catch (err) {
                console.error('[ActivityTracker] Failed to reset activity:', err);
            }
        }, debounceMs);
    }, [enabled, debounceMs]);

    // Handle auto-logout
    const handleAutoLogout = useCallback(async () => {
        console.log('[ActivityTracker] Auto-logout triggered');

        try {
            // Get current token and logout
            const token = localStorage.getItem('token');
            if (token) {
                await authApi.logout(token);
            }

            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('email');
            localStorage.removeItem('_id');
            localStorage.removeItem('user');
            localStorage.removeItem('sessionId');

            // Navigate to login
            navigate('/login', {
                replace: true,
                state: { message: 'Session expired due to inactivity' }
            });
        } catch (err) {
            console.error('[ActivityTracker] Logout error:', err);
            // Still navigate even on error
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (!enabled) return;

        // Activity events to track
        const activityEvents = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
            'click'
        ];

        // Add event listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, resetActivity, { passive: true });
        });

        // Listen for auto-logout event from backend
        if (window.electronAPI?.appSettings?.onAutoLogout) {
            window.electronAPI.appSettings.onAutoLogout(handleAutoLogout);
        }

        // Initial activity reset
        resetActivity();

        // Cleanup
        return () => {
            activityEvents.forEach(event => {
                document.removeEventListener(event, resetActivity);
            });

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [enabled, resetActivity, handleAutoLogout]);

    return {
        resetActivity,
        lastActivity: lastActivityRef.current
    };
}

export default useActivityTracker;
