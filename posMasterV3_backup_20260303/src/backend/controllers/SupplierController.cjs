/**
 * Supplier Controller
 *
 * Handles IPC communication for supplier operations.
 */

const { ipcMain } = require('electron');
const supplierService = require('../services/SupplierService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class SupplierController {
    /**
     * Register all IPC handlers for suppliers
     */
    static registerHandlers() {
        // Get all suppliers
        ipcMain.handle('suppliers:get-all', wrapIpcHandler(async () => {
            return supplierService.getAll();
        }));

        // Get active suppliers only
        ipcMain.handle('suppliers:get-active', wrapIpcHandler(async () => {
            return supplierService.getActive();
        }));

        // Get supplier by ID
        ipcMain.handle('suppliers:get-by-id', wrapIpcHandler(async (event, id) => {
            return supplierService.getById(id);
        }));

        // Search suppliers
        ipcMain.handle('suppliers:search', wrapIpcHandler(async (event, searchTerm) => {
            return supplierService.search(searchTerm);
        }));

        // Create supplier
        ipcMain.handle('suppliers:create', wrapIpcHandler(async (event, data) => {
            return supplierService.create(data);
        }));

        // Update supplier
        ipcMain.handle('suppliers:update', wrapIpcHandler(async (event, id, data) => {
            return supplierService.update(id, data);
        }));

        // Delete supplier
        ipcMain.handle('suppliers:delete', wrapIpcHandler(async (event, id) => {
            return supplierService.delete(id);
        }));

        // Update supplier amounts
        ipcMain.handle('suppliers:update-amounts', wrapIpcHandler(async (event, id, currentAmount, previousAmount) => {
            return supplierService.updateAmounts(id, currentAmount, previousAmount);
        }));

        console.log('[SupplierController] IPC handlers registered');
    }
}

module.exports = SupplierController;
