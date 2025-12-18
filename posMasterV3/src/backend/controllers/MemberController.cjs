/**
 * Member Controller
 *
 * Handles IPC communication for member (customer) operations.
 */

const { ipcMain } = require('electron');
const memberService = require('../services/MemberService.cjs');

class MemberController {
    /**
     * Register all IPC handlers for members
     */
    static registerHandlers() {
        // Get all members
        ipcMain.handle('members:get-all', async () => {
            return memberService.getAll();
        });

        // Get active members only
        ipcMain.handle('members:get-active', async () => {
            return memberService.getActive();
        });

        // Get member by ID
        ipcMain.handle('members:get-by-id', async (event, id) => {
            return memberService.getById(id);
        });

        // Get member by member number
        ipcMain.handle('members:get-by-member-no', async (event, memberNo) => {
            return memberService.getByMemberNo(memberNo);
        });

        // Get member with transaction history
        ipcMain.handle('members:get-with-transactions', async (event, id) => {
            return memberService.getWithTransactions(id);
        });

        // Search members
        ipcMain.handle('members:search', async (event, searchTerm) => {
            return memberService.search(searchTerm);
        });

        // Create member
        ipcMain.handle('members:create', async (event, data) => {
            return memberService.create(data);
        });

        // Update member
        ipcMain.handle('members:update', async (event, id, data) => {
            return memberService.update(id, data);
        });

        // Delete member
        ipcMain.handle('members:delete', async (event, id) => {
            return memberService.delete(id);
        });

        // Get top members by income
        ipcMain.handle('members:get-top', async (event, limit) => {
            return memberService.getTopMembers(limit || 10);
        });

        // Get members with credits (debtors)
        ipcMain.handle('members:get-debtors', async () => {
            return memberService.getDebtors();
        });

        console.log('[MemberController] IPC handlers registered');
    }
}

module.exports = MemberController;
