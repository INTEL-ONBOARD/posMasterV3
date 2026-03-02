/**
 * Activity Tracker Hook
 *
 * Tracks user activity and triggers auto-logout after a configurable idle period.
 * Idle tracking is handled entirely in the frontend — no IPC round-trip needed
 * for every mouse move / keypress.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/localApi';

// Default idle timeout: 10 minutes (suitable for an unattended POS terminal)
const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Hook to track user activity and handle auto-logout on idle
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether tracking is enabled
 * @param {number} options.idleTimeoutMs - Idle timeout in ms (default: 30 minutes)
 */
export function useActivityTracker({ enabled = true, idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS } = {}) {
    const navigate = useNavigate();
    const lastActivityRef = useRef(Date.now());
    const idleTimerRef = useRef(null);

    // Handle auto-logout when idle timeout fires
    const handleAutoLogout = useCallback(async () => {
        console.log('[ActivityTracker] Auto-logout triggered due to inactivity');

        try {
            const token = sessionStorage.getItem('token');
            if (token) {
                await authApi.logout(token);
            }

            // Clear all auth state from both storages
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('username');
            sessionStorage.removeItem('email');
            sessionStorage.removeItem('_id');
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('email');
            localStorage.removeItem('_id');
            localStorage.removeItem('user');
            localStorage.removeItem('sessionId');

            navigate('/login', {
                replace: true,
                state: { message: 'Session expired due to inactivity' }
            });
        } catch (err) {
            console.error('[ActivityTracker] Logout error:', err);
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    // Reset the idle countdown on any user activity
    const resetIdle = useCallback(() => {
        if (!enabled) return;
        lastActivityRef.current = Date.now();
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(handleAutoLogout, idleTimeoutMs);
    }, [enabled, idleTimeoutMs, handleAutoLogout]);

    useEffect(() => {
        if (!enabled) return;

        const activityEvents = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
            'click'
        ];

        activityEvents.forEach(event => {
            document.addEventListener(event, resetIdle, { passive: true });
        });

        // Listen for auto-logout event from backend (if implemented in future)
        if (window.electronAPI?.appSettings?.onAutoLogout) {
            window.electronAPI.appSettings.onAutoLogout(handleAutoLogout);
        }

        // Start the idle timer immediately on mount
        idleTimerRef.current = setTimeout(handleAutoLogout, idleTimeoutMs);

        return () => {
            activityEvents.forEach(event => {
                document.removeEventListener(event, resetIdle);
            });
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
        };
    }, [enabled, resetIdle, handleAutoLogout, idleTimeoutMs]);

    return {
        resetIdle,
        lastActivity: lastActivityRef.current
    };
}

export default useActivityTracker;
