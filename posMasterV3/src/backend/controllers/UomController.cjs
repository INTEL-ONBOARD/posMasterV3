/**
 * UOM Controller
 *
 * Handles IPC communication for unit of measurement operations.
 */

const { ipcMain } = require('electron');
const uomService = require('../services/UomService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class UomController {
    /**
     * Register all IPC handlers for UOMs
     */
    static registerHandlers() {
        // Get all UOMs
        ipcMain.handle('uom:get-all', wrapIpcHandler(async () => {
            return uomService.getAll();
        }));

        // Get UOM by ID
        ipcMain.handle('uom:get-by-id', wrapIpcHandler(async (event, id) => {
            return uomService.getById(id);
        }));

        // Search UOMs
        ipcMain.handle('uom:search', wrapIpcHandler(async (event, searchTerm) => {
            return uomService.search(searchTerm);
        }));

        // Create UOM
        ipcMain.handle('uom:create', wrapIpcHandler(async (event, data) => {
            return uomService.create(data);
        }));

        // Update UOM
        ipcMain.handle('uom:update', wrapIpcHandler(async (event, id, data) => {
            return uomService.update(id, data);
        }));

        // Delete UOM
        ipcMain.handle('uom:delete', wrapIpcHandler(async (event, id) => {
            return uomService.delete(id);
        }));

        console.log('[UomController] IPC handlers registered');
    }
}

module.exports = UomController;
