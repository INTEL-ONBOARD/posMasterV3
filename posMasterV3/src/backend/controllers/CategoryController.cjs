/**
 * Category Controller
 *
 * Handles IPC communication for category operations.
 */

const { ipcMain } = require('electron');
const categoryService = require('../services/CategoryService.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

class CategoryController {
    /**
     * Register all IPC handlers for categories
     */
    static registerHandlers() {
        // Get all categories
        ipcMain.handle('categories:get-all', wrapIpcHandler(async () => {
            return categoryService.getAll();
        }));

        // Get category by ID
        ipcMain.handle('categories:get-by-id', wrapIpcHandler(async (event, id) => {
            return categoryService.getById(id);
        }));

        // Get unique category types
        ipcMain.handle('categories:get-types', wrapIpcHandler(async () => {
            return categoryService.getUniqueTypes();
        }));

        // Search categories
        ipcMain.handle('categories:search', wrapIpcHandler(async (event, searchTerm) => {
            return categoryService.search(searchTerm);
        }));

        // Create category
        ipcMain.handle('categories:create', wrapIpcHandler(async (event, data) => {
            return categoryService.create(data);
        }));

        // Update category
        ipcMain.handle('categories:update', wrapIpcHandler(async (event, id, data) => {
            return categoryService.update(id, data);
        }));

        // Delete category
        ipcMain.handle('categories:delete', wrapIpcHandler(async (event, id) => {
            return categoryService.delete(id);
        }));

        console.log('[CategoryController] IPC handlers registered');
    }
}

module.exports = CategoryController;
