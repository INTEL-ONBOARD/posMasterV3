/**
 * Supplier Controller
 *
 * Handles IPC communication for supplier operations.
 */

const { ipcMain } = require('electron');
const supplierService = require('../services/SupplierService.cjs');

class SupplierController {
    /**
     * Register all IPC handlers for suppliers
     */
    static registerHandlers() {
        // Get all suppliers
        ipcMain.handle('suppliers:get-all', async () => {
            return supplierService.getAll();
        });

        // Get active suppliers only
        ipcMain.handle('suppliers:get-active', async () => {
            return supplierService.getActive();
        });

        // Get supplier by ID
        ipcMain.handle('suppliers:get-by-id', async (event, id) => {
            return supplierService.getById(id);
        });

        // Search suppliers
        ipcMain.handle('suppliers:search', async (event, searchTerm) => {
            return supplierService.search(searchTerm);
        });

        // Create supplier
        ipcMain.handle('suppliers:create', async (event, data) => {
            return supplierService.create(data);
        });

        // Update supplier
        ipcMain.handle('suppliers:update', async (event, id, data) => {
            return supplierService.update(id, data);
        });

        // Delete supplier
        ipcMain.handle('suppliers:delete', async (event, id) => {
            return supplierService.delete(id);
        });

        // Update supplier amounts
        ipcMain.handle('suppliers:update-amounts', async (event, id, currentAmount, previousAmount) => {
            return supplierService.updateAmounts(id, currentAmount, previousAmount);
        });

        console.log('[SupplierController] IPC handlers registered');
    }
}

module.exports = SupplierController;
