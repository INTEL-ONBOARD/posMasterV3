/**
 * Disposed Items Controller
 *
 * Handles IPC communication for stock disposal operations.
 */

const { ipcMain } = require('electron');
const disposedItemsService = require('../services/DisposedItemsService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class DisposedItemsController {
    static registerHandlers() {
        // Get all disposed items (branch-filtered)
        ipcMain.handle('disposed:get-all', wrapIpcHandler(async () => {
            return disposedItemsService.getAll();
        }));

        // Record a new disposal
        ipcMain.handle('disposed:create', wrapIpcHandler(async (event, data) => {
            return disposedItemsService.create(data);
        }));

        // Get disposed items by date range
        ipcMain.handle('disposed:get-by-date-range', wrapIpcHandler(async (event, startDate, endDate) => {
            return disposedItemsService.getByDateRange(startDate, endDate);
        }));

        console.log('[DisposedItemsController] IPC handlers registered');
    }
}

module.exports = DisposedItemsController;
