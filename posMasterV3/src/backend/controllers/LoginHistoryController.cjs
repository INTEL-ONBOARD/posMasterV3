/**
 * Login History Controller
 *
 * Handles IPC communication for login history operations.
 * Provides endpoints for viewing user login/logout activity.
 */

const { ipcMain } = require('electron');
const { getLoginHistoryRepository } = require('../repositories/index.cjs');

class LoginHistoryController {
    constructor() {
        this.repo = null;
    }

    /**
     * Get repository instance
     */
    getRepo() {
        if (!this.repo) {
            this.repo = getLoginHistoryRepository();
        }
        return this.repo;
    }

    /**
     * Register all IPC handlers for login history
     */
    registerHandlers() {
        // Get all login history with pagination
        ipcMain.handle('loginHistory:getAll', async (event, options = {}) => {
            try {
                const data = this.getRepo().getAll(options);
                return { status: 'success', data };
            } catch (error) {
                console.error('[LoginHistoryController] Get all error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Get login history for a specific user
        ipcMain.handle('loginHistory:getByUser', async (event, userId, options = {}) => {
            try {
                const data = this.getRepo().getByUserId(userId, options);
                return { status: 'success', data };
            } catch (error) {
                console.error('[LoginHistoryController] Get by user error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Get login history by date range
        ipcMain.handle('loginHistory:getByDateRange', async (event, startDate, endDate) => {
            try {
                const data = this.getRepo().getByDateRange(startDate, endDate);
                return { status: 'success', data };
            } catch (error) {
                console.error('[LoginHistoryController] Get by date range error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Get user statistics
        ipcMain.handle('loginHistory:getUserStats', async (event, userId) => {
            try {
                const data = this.getRepo().getUserStats(userId);
                return { status: 'success', data };
            } catch (error) {
                console.error('[LoginHistoryController] Get user stats error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Get daily statistics
        ipcMain.handle('loginHistory:getDailyStats', async (event, days = 30) => {
            try {
                const data = this.getRepo().getDailyStats(days);
                return { status: 'success', data };
            } catch (error) {
                console.error('[LoginHistoryController] Get daily stats error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Get user activity summary
        ipcMain.handle('loginHistory:getUserActivitySummary', async (event, days = 30) => {
            try {
                const data = this.getRepo().getUserActivitySummary(days);
                return { status: 'success', data };
            } catch (error) {
                console.error('[LoginHistoryController] Get user activity summary error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Get currently active sessions
        ipcMain.handle('loginHistory:getActiveSessions', async () => {
            try {
                const data = this.getRepo().getActiveSessions();
                return { status: 'success', data };
            } catch (error) {
                console.error('[LoginHistoryController] Get active sessions error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Count active sessions
        ipcMain.handle('loginHistory:countActiveSessions', async () => {
            try {
                const count = this.getRepo().countActiveSessions();
                return { status: 'success', data: { count } };
            } catch (error) {
                console.error('[LoginHistoryController] Count active sessions error:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Mark stale sessions (cleanup)
        ipcMain.handle('loginHistory:markStaleSessions', async (event, hoursThreshold = 24) => {
            try {
                const count = this.getRepo().markStaleSessions(hoursThreshold);
                return { status: 'success', data: { markedCount: count } };
            } catch (error) {
                console.error('[LoginHistoryController] Mark stale sessions error:', error);
                return { status: 'error', message: error.message };
            }
        });

        console.log('[LoginHistoryController] IPC handlers registered');
    }
}

module.exports = LoginHistoryController;
