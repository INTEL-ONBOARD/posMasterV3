/**
 * Payment Method Controller
 *
 * Handles IPC communication for payment method operations.
 */

const { ipcMain } = require('electron');
const paymentMethodService = require('../services/PaymentMethodService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class PaymentMethodController {
    /**
     * Register all IPC handlers for payment methods
     */
    static registerHandlers() {
        // Get all payment methods
        ipcMain.handle('payment-methods:get-all', wrapIpcHandler(async () => {
            return paymentMethodService.getAll();
        }));

        // Get active payment methods
        ipcMain.handle('payment-methods:get-active', wrapIpcHandler(async () => {
            return paymentMethodService.getActive();
        }));

        // Get payment methods for members
        ipcMain.handle('payment-methods:get-for-members', wrapIpcHandler(async () => {
            return paymentMethodService.getForMembers();
        }));

        // Get payment methods for non-members
        ipcMain.handle('payment-methods:get-for-non-members', wrapIpcHandler(async () => {
            return paymentMethodService.getForNonMembers();
        }));

        // Get payment method by ID
        ipcMain.handle('payment-methods:get-by-id', wrapIpcHandler(async (event, id) => {
            return paymentMethodService.getById(id);
        }));

        // Search payment methods
        ipcMain.handle('payment-methods:search', wrapIpcHandler(async (event, searchTerm) => {
            return paymentMethodService.search(searchTerm);
        }));

        // Create payment method
        ipcMain.handle('payment-methods:create', wrapIpcHandler(async (event, data) => {
            return paymentMethodService.create(data);
        }));

        // Update payment method
        ipcMain.handle('payment-methods:update', wrapIpcHandler(async (event, id, data) => {
            return paymentMethodService.update(id, data);
        }));

        // Toggle active status
        ipcMain.handle('payment-methods:toggle-active', wrapIpcHandler(async (event, id) => {
            return paymentMethodService.toggleActive(id);
        }));

        // Delete payment method
        ipcMain.handle('payment-methods:delete', wrapIpcHandler(async (event, id) => {
            return paymentMethodService.delete(id);
        }));

        console.log('[PaymentMethodController] IPC handlers registered');
    }
}

module.exports = PaymentMethodController;
