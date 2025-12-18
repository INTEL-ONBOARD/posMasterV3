/**
 * Restock Controller
 *
 * Handles IPC communication for restock transaction operations.
 */

const { ipcMain } = require('electron');
const restockService = require('../services/RestockService.cjs');

class RestockController {
    /**
     * Register all IPC handlers for restocks
     */
    static registerHandlers() {
        // Get all restocks
        ipcMain.handle('restocks:get-all', async (event, options) => {
            return restockService.getAll(options);
        });

        // Get restock by ID
        ipcMain.handle('restocks:get-by-id', async (event, id) => {
            return restockService.getById(id);
        });

        // Get restock by invoice number
        ipcMain.handle('restocks:get-by-invoice', async (event, invoiceNo) => {
            return restockService.getByInvoiceNo(invoiceNo);
        });

        // Get restocks by supplier
        ipcMain.handle('restocks:get-by-supplier', async (event, supplierId) => {
            return restockService.getBySupplierId(supplierId);
        });

        // Get restocks by date range
        ipcMain.handle('restocks:get-by-date-range', async (event, startDate, endDate) => {
            return restockService.getByDateRange(startDate, endDate);
        });

        // Get stock data by SKU (for restock form)
        ipcMain.handle('restocks:get-stock-data', async (event, sku) => {
            return restockService.getStockDataBySku(sku);
        });

        // Get all stock items
        ipcMain.handle('restocks:get-stock-items', async () => {
            return restockService.getStockItems();
        });

        // Create restock transaction
        ipcMain.handle('restocks:create', async (event, data) => {
            return restockService.create(data);
        });

        // Get restock summary
        ipcMain.handle('restocks:get-summary', async (event, startDate, endDate) => {
            return restockService.getSummary(startDate, endDate);
        });

        console.log('[RestockController] IPC handlers registered');
    }
}

module.exports = RestockController;
