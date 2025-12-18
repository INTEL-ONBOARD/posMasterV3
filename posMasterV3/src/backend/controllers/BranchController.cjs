/**
 * Branch Controller
 *
 * Handles IPC communication for branch (inventory/outlet) operations.
 */

const { ipcMain } = require('electron');
const branchService = require('../services/BranchService.cjs');

class BranchController {
    /**
     * Register all IPC handlers for branches
     */
    static registerHandlers() {
        // Get all branches
        ipcMain.handle('branches:get-all', async () => {
            return branchService.getAll();
        });

        // Get active branches only
        ipcMain.handle('branches:get-active', async () => {
            return branchService.getActive();
        });

        // Get branch by ID
        ipcMain.handle('branches:get-by-id', async (event, id) => {
            return branchService.getById(id);
        });

        // Search branches
        ipcMain.handle('branches:search', async (event, searchTerm) => {
            return branchService.search(searchTerm);
        });

        // Create branch
        ipcMain.handle('branches:create', async (event, data) => {
            return branchService.create(data);
        });

        // Update branch
        ipcMain.handle('branches:update', async (event, id, data) => {
            return branchService.update(id, data);
        });

        // Delete branch
        ipcMain.handle('branches:delete', async (event, id) => {
            return branchService.delete(id);
        });

        console.log('[BranchController] IPC handlers registered');
    }
}

module.exports = BranchController;
