/**
 * Migration: Fix User Roles
 *
 * Ensures all users have valid roles set.
 * - Admin user gets ['admin'] role
 * - Other users without roles get ['user'] role
 */

module.exports = {
    version: 27,
    name: '027_fix_user_roles',

    up(db) {
        // Fix admin user roles
        const adminUser = db.prepare("SELECT id, roles FROM users WHERE username = 'admin' LIMIT 1").get();
        if (adminUser) {
            let needsFix = false;
            try {
                const roles = adminUser.roles ? JSON.parse(adminUser.roles) : [];
                if (!Array.isArray(roles) || roles.length === 0 || !roles.includes('admin')) {
                    needsFix = true;
                }
            } catch (e) {
                needsFix = true;
            }

            if (needsFix) {
                db.prepare("UPDATE users SET roles = ? WHERE id = ?")
                    .run(JSON.stringify(['admin']), adminUser.id);
                console.log('[Migration 027] Fixed admin user roles');
            }
        }

        // Fix all other users without valid roles
        const usersWithoutRoles = db.prepare(`
            SELECT id, username, roles FROM users
            WHERE roles IS NULL OR roles = '' OR roles = '[]' OR roles = 'null'
        `).all();

        for (const user of usersWithoutRoles) {
            // Don't change admin user here (handled above)
            if (user.username === 'admin') continue;

            db.prepare("UPDATE users SET roles = ? WHERE id = ?")
                .run(JSON.stringify(['user']), user.id);
            console.log(`[Migration 027] Fixed roles for user: ${user.username}`);
        }

        console.log('[Migration 027] User roles fix completed');
    },

    down(db) {
        // No rollback needed - this is a fix migration
        console.log('[Migration 027] No rollback action for user roles fix');
    }
};
