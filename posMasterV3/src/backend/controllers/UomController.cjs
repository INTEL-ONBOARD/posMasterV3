/**
 * UOM Controller
 *
 * Handles IPC communication for unit of measurement operations.
 */

const { ipcMain } = require('electron');
const uomService = require('../services/UomService.cjs');

class UomController {
    /**
     * Register all IPC handlers for UOMs
     */
    static registerHandlers() {
        // Get all UOMs
        ipcMain.handle('uom:get-all', async () => {
            return uomService.getAll();
        });

        // Get UOM by ID
        ipcMain.handle('uom:get-by-id', async (event, id) => {
            return uomService.getById(id);
        });

        // Search UOMs
        ipcMain.handle('uom:search', async (event, searchTerm) => {
            return uomService.search(searchTerm);
        });

        // Create UOM
        ipcMain.handle('uom:create', async (event, data) => {
            return uomService.create(data);
        });

        // Update UOM
        ipcMain.handle('uom:update', async (event, id, data) => {
            return uomService.update(id, data);
        });

        // Delete UOM
        ipcMain.handle('uom:delete', async (event, id) => {
            return uomService.delete(id);
        });

        console.log('[UomController] IPC handlers registered');
    }
}

module.exports = UomController;
