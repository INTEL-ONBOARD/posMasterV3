/**
 * Offers & Discounts Controller
 *
 * IPC handlers for discount offer management.
 */

const { ipcMain } = require('electron');
const offersService = require('../services/OffersDiscountsService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class OffersDiscountsController {
    static registerHandlers() {
        ipcMain.handle('offers:get-all', wrapIpcHandler(async () => {
            return offersService.getAll();
        }));

        ipcMain.handle('offers:get-active', wrapIpcHandler(async () => {
            return offersService.getActive();
        }));

        ipcMain.handle('offers:create', wrapIpcHandler(async (event, data) => {
            return offersService.create(data);
        }));

        ipcMain.handle('offers:update', wrapIpcHandler(async (event, id, data) => {
            return offersService.update(id, data);
        }));

        ipcMain.handle('offers:delete', wrapIpcHandler(async (event, id) => {
            return offersService.delete(id);
        }));

        ipcMain.handle('offers:toggle-active', wrapIpcHandler(async (event, id) => {
            return offersService.toggleActive(id);
        }));

        console.log('[OffersDiscountsController] IPC handlers registered');
    }
}

module.exports = OffersDiscountsController;
