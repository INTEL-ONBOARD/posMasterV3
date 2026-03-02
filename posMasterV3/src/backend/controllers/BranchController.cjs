/**
 * Branch Controller
 *
 * Handles IPC communication for branch (inventory/outlet) operations.
 */

const { ipcMain } = require('electron');
const branchService = require('../services/BranchService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class BranchController {
    /**
     * Register all IPC handlers for branches
     */
    static registerHandlers() {
        // Get all branches
        ipcMain.handle('branches:get-all', wrapIpcHandler(async () => {
            return branchService.getAll();
        }));

        // Get active branches only
        ipcMain.handle('branches:get-active', wrapIpcHandler(async () => {
            return branchService.getActive();
        }));

        // Get branch by ID
        ipcMain.handle('branches:get-by-id', wrapIpcHandler(async (event, id) => {
            return branchService.getById(id);
        }));

        // Search branches
        ipcMain.handle('branches:search', wrapIpcHandler(async (event, searchTerm) => {
            return branchService.search(searchTerm);
        }));

        // Create branch
        ipcMain.handle('branches:create', wrapIpcHandler(async (event, data) => {
            return branchService.create(data);
        }));

        // Update branch
        ipcMain.handle('branches:update', wrapIpcHandler(async (event, id, data) => {
            return branchService.update(id, data);
        }));

        // Delete branch
        ipcMain.handle('branches:delete', wrapIpcHandler(async (event, id) => {
            return branchService.delete(id);
        }));

        console.log('[BranchController] IPC handlers registered');
    }
}

module.exports = BranchController;
