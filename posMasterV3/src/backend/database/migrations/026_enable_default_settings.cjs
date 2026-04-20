/**
 * Migration: Enable Default Settings
 *
 * Updates existing app_settings to have all settings enabled by default.
 * Also adds auto_logout_minutes if it doesn't exist.
 */

module.exports = {
    version: 26,
    name: '026_enable_default_settings',

    up(db) {
        const now = new Date().toISOString();

        // Update existing settings to enabled
        const settingsToEnable = [
            'auto_logout',
            'notifications',
            'temp_system',
            'run_on_startup',
            'maximize_window'
        ];

        const updateStmt = db.prepare(`
            UPDATE app_settings
            SET setting_value = 'true', updated_at = ?
            WHERE setting_key = ? AND setting_type = 'boolean'
        `);

        for (const key of settingsToEnable) {
            updateStmt.run(now, key);
        }

        // Add auto_logout_minutes if it doesn't exist
        const existingMinutes = db.prepare(`
            SELECT 1 FROM app_settings WHERE setting_key = 'auto_logout_minutes'
        `).get();

        if (!existingMinutes) {
            const id = `setting_auto_logout_minutes_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            db.prepare(`
                INSERT INTO app_settings (id, setting_key, setting_value, setting_type, description, created_at, updated_at)
                VALUES (?, 'auto_logout_minutes', '15', 'number', 'Auto logout timeout in minutes', ?, ?)
            `).run(id, now, now);
        }

        console.log('[Migration 026] Enabled all default settings');
    },

    down(db) {
        const now = new Date().toISOString();

        // Revert to original defaults (some disabled)
        const settingsToDisable = [
            'auto_logout',
            'cloud_sync',
            'temp_system'
        ];

        const updateStmt = db.prepare(`
            UPDATE app_settings
            SET setting_value = 'false', updated_at = ?
            WHERE setting_key = ?
        `);

        for (const key of settingsToDisable) {
            updateStmt.run(now, key);
        }

        console.log('[Migration 026] Reverted default settings');
    }
};
