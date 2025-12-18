/**
 * Stock Controller
 *
 * Handles IPC communication for stock operations.
 */

const { ipcMain } = require('electron');
const stockService = require('../services/StockService.cjs');

class StockController {
    /**
     * Register all IPC handlers for stock
     */
    static registerHandlers() {
        // Get all stock
        ipcMain.handle('stock:get-all', async () => {
            return stockService.getAll();
        });

        // Get all stock with item details
        ipcMain.handle('stock:get-all-with-items', async () => {
            return stockService.getAllWithItems();
        });

        // Get stock by ID
        ipcMain.handle('stock:get-by-id', async (event, id) => {
            return stockService.getById(id);
        });

        // Get stock by item SKU
        ipcMain.handle('stock:get-by-sku', async (event, sku) => {
            return stockService.getByItemSku(sku);
        });

        // Get low stock items
        ipcMain.handle('stock:get-low-stock', async () => {
            return stockService.getLowStock();
        });

        // Get expiring stock
        ipcMain.handle('stock:get-expiring', async (event, days) => {
            return stockService.getExpiringStock(days || 30);
        });

        // Get stock value summary
        ipcMain.handle('stock:get-value', async () => {
            return stockService.getStockValue();
        });

        // Create or update stock
        ipcMain.handle('stock:upsert', async (event, data) => {
            return stockService.upsert(data);
        });

        // Update stock quantity
        ipcMain.handle('stock:update-quantity', async (event, id, quantity) => {
            return stockService.updateQuantity(id, quantity);
        });

        // Update stock prices
        ipcMain.handle('stock:update-prices', async (event, id, stockPrice, retailPrice) => {
            return stockService.updatePrices(id, stockPrice, retailPrice);
        });

        // Delete stock
        ipcMain.handle('stock:delete', async (event, id) => {
            return stockService.delete(id);
        });

        console.log('[StockController] IPC handlers registered');
    }
}

module.exports = StockController;
