/**
 * Sales Controller
 *
 * Handles IPC communication for sales transaction operations.
 */

const { ipcMain } = require('electron');
const salesService = require('../services/SalesService.cjs');

class SalesController {
    /**
     * Register all IPC handlers for sales
     */
    static registerHandlers() {
        // Get all sales
        ipcMain.handle('sales:get-all', async (event, options) => {
            return salesService.getAll(options);
        });

        // Get sale by ID
        ipcMain.handle('sales:get-by-id', async (event, id) => {
            return salesService.getById(id);
        });

        // Get sale by invoice number
        ipcMain.handle('sales:get-by-invoice', async (event, invoiceNo) => {
            return salesService.getByInvoiceNo(invoiceNo);
        });

        // Get sales by member
        ipcMain.handle('sales:get-by-member', async (event, memberId) => {
            return salesService.getByMemberId(memberId);
        });

        // Get sales by date range
        ipcMain.handle('sales:get-by-date-range', async (event, startDate, endDate) => {
            return salesService.getByDateRange(startDate, endDate);
        });

        // Get held orders
        ipcMain.handle('sales:get-held-orders', async () => {
            return salesService.getHeldOrders();
        });

        // Create sale
        ipcMain.handle('sales:create', async (event, data) => {
            return salesService.create(data);
        });

        // Hold order
        ipcMain.handle('sales:hold', async (event, data) => {
            return salesService.holdOrder(data);
        });

        // Complete held order
        ipcMain.handle('sales:complete-held', async (event, id, updateData) => {
            return salesService.completeHeldOrder(id, updateData);
        });

        // Cancel sale
        ipcMain.handle('sales:cancel', async (event, id) => {
            return salesService.cancel(id);
        });

        // Get sales summary
        ipcMain.handle('sales:get-summary', async (event, startDate, endDate) => {
            return salesService.getSummary(startDate, endDate);
        });

        // Get daily sales
        ipcMain.handle('sales:get-daily', async (event, days) => {
            return salesService.getDailySales(days || 30);
        });

        // Generate invoice number
        ipcMain.handle('sales:generate-invoice-no', async () => {
            return salesService.generateInvoiceNo();
        });

        console.log('[SalesController] IPC handlers registered');
    }
}

module.exports = SalesController;
