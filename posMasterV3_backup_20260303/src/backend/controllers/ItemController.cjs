/**
 * Item Controller
 *
 * Handles IPC communication for item (registry) operations.
 */

const { ipcMain } = require('electron');
const itemService = require('../services/ItemService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class ItemController {
    /**
     * Register all IPC handlers for items
     */
    static registerHandlers() {
        // Get all items
        ipcMain.handle('items:get-all', wrapIpcHandler(async () => {
            return itemService.getAll();
        }));

        // Get all items with extended data (category, uom, stock)
        ipcMain.handle('items:get-all-extended', wrapIpcHandler(async () => {
            return itemService.getAllExtended();
        }));

        // Get item by ID
        ipcMain.handle('items:get-by-id', wrapIpcHandler(async (event, id) => {
            return itemService.getById(id);
        }));

        // Get item by ID with extended data
        ipcMain.handle('items:get-by-id-extended', wrapIpcHandler(async (event, id) => {
            return itemService.getByIdExtended(id);
        }));

        // Get item by SKU
        ipcMain.handle('items:get-by-sku', wrapIpcHandler(async (event, sku) => {
            return itemService.getBySku(sku);
        }));

        // Search items
        ipcMain.handle('items:search', wrapIpcHandler(async (event, searchTerm) => {
            return itemService.search(searchTerm);
        }));

        // Create item
        ipcMain.handle('items:create', wrapIpcHandler(async (event, data) => {
            return itemService.create(data);
        }));

        // Update item
        ipcMain.handle('items:update', wrapIpcHandler(async (event, id, data) => {
            return itemService.update(id, data);
        }));

        // Delete item
        ipcMain.handle('items:delete', wrapIpcHandler(async (event, id) => {
            return itemService.delete(id);
        }));

        console.log('[ItemController] IPC handlers registered');
    }
}

module.exports = ItemController;
