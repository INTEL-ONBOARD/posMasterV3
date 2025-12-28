/**
 * BranchContextService
 *
 * Manages the current branch context for the application.
 * This service ensures that:
 * 1. A branch must be selected before certain operations
 * 2. Data queries are filtered by the selected branch where appropriate
 * 3. New records are associated with the current branch
 * 4. Audit logs track which branch operations occurred in
 */

const { ipcMain, BrowserWindow } = require('electron');

class BranchContextService {
    constructor() {
        // Current branch context (null means no branch selected)
        this.currentBranch = null;
        this.currentUser = null;
        this.db = null;

        // Tables that are BRANCH-SPECIFIC (data filtered by branch)
        this.branchSpecificTables = [
            'stock',
            'sales_transactions',
            'sales_items',
            'restock_transactions',
            'restock_items',
            'return_items'
        ];

        // Tables that are GLOBAL (shared across all branches)
        this.globalTables = [
            'categories',
            'units_of_measurement',
            'payment_methods',
            'suppliers',
            'users',
            'branches'
        ];

        // Tables that CAN be branch-specific but also global
        // (NULL branch_id means shared across all branches, specific ID means branch-only)
        // Items are GLOBAL - shared across all branches
        // Stock is BRANCH-SPECIFIC - each branch has its own stock quantities
        this.optionalBranchTables = [
            'members' // Members can be global (shared across branches)
        ];
    }

    /**
     * Initialize the service with database connection
     */
    initialize(db) {
        this.db = db;
        this.registerIpcHandlers();

        // Load previously saved branch selection
        this.loadSavedBranch().then(branch => {
            if (branch) {
                console.log('[BranchContextService] Restored saved branch:', branch.name);
            } else {
                console.log('[BranchContextService] No saved branch found');
            }
        }).catch(err => {
            console.error('[BranchContextService] Error loading saved branch:', err);
        });

        console.log('[BranchContextService] Initialized');
    }

    /**
     * Register IPC handlers for branch context management
     */
    registerIpcHandlers() {
        // Get current branch context
        ipcMain.handle('branch-context:get-current', () => {
            return {
                status: 'success',
                data: this.currentBranch
            };
        });

        // Set current branch context
        ipcMain.handle('branch-context:set-current', async (event, branchId) => {
            try {
                return await this.setCurrentBranch(branchId);
            } catch (error) {
                console.error('[BranchContextService] Error setting branch:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Clear branch context
        ipcMain.handle('branch-context:clear', () => {
            this.currentBranch = null;
            this.broadcastBranchChange(null);
            return { status: 'success', data: null };
        });

        // Check if branch is required
        ipcMain.handle('branch-context:is-required', () => {
            return {
                status: 'success',
                data: {
                    required: this.currentBranch === null,
                    currentBranch: this.currentBranch
                }
            };
        });

        // Get branches available to current user
        ipcMain.handle('branch-context:get-available-branches', async () => {
            try {
                const branches = await this.getAvailableBranches();
                return { status: 'success', data: branches };
            } catch (error) {
                console.error('[BranchContextService] Error getting branches:', error);
                return { status: 'error', message: error.message };
            }
        });

        // Validate operation requires branch
        ipcMain.handle('branch-context:validate-operation', (event, operation) => {
            return this.validateOperation(operation);
        });

        console.log('[BranchContextService] IPC handlers registered');
    }

    /**
     * Set the current user context
     */
    setCurrentUser(user) {
        this.currentUser = user;
        console.log('[BranchContextService] User context set:', user?.username || 'none');
    }

    /**
     * Set the current branch
     */
    async setCurrentBranch(branchId) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        if (branchId === null) {
            this.currentBranch = null;
            this.broadcastBranchChange(null);
            return { status: 'success', data: null };
        }

        // Fetch branch details
        const branch = this.db.prepare(`
            SELECT id, cloud_id, name, address, contact, is_active
            FROM branches
            WHERE id = ? AND is_active = 1
        `).get(branchId);

        if (!branch) {
            throw new Error(`Branch with ID ${branchId} not found or inactive`);
        }

        this.currentBranch = branch;

        // Update app_settings with selected branch
        // Using ON CONFLICT(setting_key) since setting_key has UNIQUE constraint
        const now = new Date().toISOString();
        this.db.prepare(`
            INSERT INTO app_settings (id, setting_key, setting_value, setting_type, description, created_at, updated_at)
            VALUES ('selected_branch_id', 'selected_branch_id', ?, 'number', 'Currently selected branch ID', ?, ?)
            ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at
        `).run(branchId.toString(), now, now);

        this.db.prepare(`
            INSERT INTO app_settings (id, setting_key, setting_value, setting_type, description, created_at, updated_at)
            VALUES ('selected_branch_name', 'selected_branch_name', ?, 'string', 'Currently selected branch name', ?, ?)
            ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at
        `).run(branch.name, now, now);

        // Also update default_outlet for AppSettings consistency
        this.db.prepare(`
            INSERT INTO app_settings (id, setting_key, setting_value, setting_type, description, created_at, updated_at)
            VALUES ('default_outlet', 'default_outlet', ?, 'string', 'Default outlet/branch name', ?, ?)
            ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at
        `).run(branch.name, now, now);

        // Broadcast branch change to all windows
        this.broadcastBranchChange(branch);

        console.log('[BranchContextService] Branch set to:', branch.name);

        return { status: 'success', data: branch };
    }

    /**
     * Get the current branch ID
     */
    getCurrentBranchId() {
        return this.currentBranch?.id || null;
    }

    /**
     * Get full branch context for operations
     */
    getBranchContext() {
        return {
            branchId: this.currentBranch?.id || null,
            branchName: this.currentBranch?.name || null,
            userId: this.currentUser?.id || null,
            userName: this.currentUser?.username || this.currentUser?.full_name || null
        };
    }

    /**
     * Get branches available to the current user
     */
    async getAvailableBranches() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        // If user has specific branch assignment, only return that branch
        // Otherwise return all active branches (admin/superadmin)
        if (this.currentUser?.branch_id) {
            const branch = this.db.prepare(`
                SELECT id, cloud_id, name, address, contact, is_active
                FROM branches
                WHERE id = ? AND is_active = 1
            `).get(this.currentUser.branch_id);

            return branch ? [branch] : [];
        }

        // Return all active branches for admins
        const branches = this.db.prepare(`
            SELECT id, cloud_id, name, address, contact, is_active
            FROM branches
            WHERE is_active = 1
            ORDER BY name ASC
        `).all();

        return branches;
    }

    /**
     * Validate if an operation can proceed
     */
    validateOperation(operation) {
        // Operations that require branch selection
        const branchRequiredOperations = [
            'create_sale',
            'create_restock',
            'add_stock',
            'update_stock',
            'create_transaction'
        ];

        const requiresBranch = branchRequiredOperations.includes(operation);

        if (requiresBranch && !this.currentBranch) {
            return {
                status: 'error',
                valid: false,
                message: 'Please select a branch/outlet before performing this operation',
                requiresBranch: true
            };
        }

        return {
            status: 'success',
            valid: true,
            currentBranch: this.currentBranch
        };
    }

    /**
     * Check if a table is branch-specific
     */
    isBranchSpecificTable(tableName) {
        return this.branchSpecificTables.includes(tableName);
    }

    /**
     * Check if a table has optional branch association
     */
    hasOptionalBranch(tableName) {
        return this.optionalBranchTables.includes(tableName);
    }

    /**
     * Get branch filter SQL for queries
     */
    getBranchFilterSQL(tableName, alias = '') {
        const prefix = alias ? `${alias}.` : '';

        if (this.isBranchSpecificTable(tableName)) {
            if (this.currentBranch) {
                return `${prefix}branch_id = ${this.currentBranch.id}`;
            }
            // No branch selected - return all (or could throw error)
            return '1=1';
        }

        if (this.hasOptionalBranch(tableName)) {
            if (this.currentBranch) {
                // Return items for this branch OR global items (NULL branch_id)
                return `(${prefix}branch_id = ${this.currentBranch.id} OR ${prefix}branch_id IS NULL)`;
            }
            return '1=1';
        }

        // Global tables - no filter
        return '1=1';
    }

    /**
     * Load saved branch from app_settings on startup
     */
    async loadSavedBranch() {
        if (!this.db) {
            console.warn('[BranchContextService] Database not initialized, cannot load saved branch');
            return null;
        }

        try {
            // Using correct column names: setting_key, setting_value
            const setting = this.db.prepare(`
                SELECT setting_value FROM app_settings WHERE setting_key = 'selected_branch_id'
            `).get();

            if (setting?.setting_value) {
                const branchId = parseInt(setting.setting_value, 10);
                if (!isNaN(branchId)) {
                    await this.setCurrentBranch(branchId);
                    return this.currentBranch;
                }
            }
        } catch (error) {
            console.error('[BranchContextService] Error loading saved branch:', error);
        }

        return null;
    }

    /**
     * Broadcast branch change to all renderer windows
     */
    broadcastBranchChange(branch) {
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            if (!window.isDestroyed()) {
                window.webContents.send('branch-context:changed', branch);
            }
        });
    }

    /**
     * Log an audit entry
     */
    logAudit(tableName, recordId, action, oldValues = null, newValues = null, changedFields = null) {
        if (!this.db) return;

        try {
            const context = this.getBranchContext();

            this.db.prepare(`
                INSERT INTO audit_log (
                    table_name, record_id, action,
                    user_id, user_name, branch_id, branch_name,
                    old_values, new_values, changed_fields, device_info
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                tableName,
                recordId?.toString() || '',
                action,
                context.userId,
                context.userName,
                context.branchId,
                context.branchName,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                changedFields ? JSON.stringify(changedFields) : null,
                process.platform
            );
        } catch (error) {
            console.error('[BranchContextService] Error logging audit:', error);
        }
    }
}

// Singleton instance
const branchContextService = new BranchContextService();

module.exports = {
    BranchContextService,
    branchContextService
};
