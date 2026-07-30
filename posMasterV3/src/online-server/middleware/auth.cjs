const jwt = require('jsonwebtoken');
const { config } = require('../config.cjs');
const { getDb } = require('../db/mongo.cjs');
const { hashToken } = require('../utils/security.cjs');

async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) {
            return res.status(401).json({ status: 'error', message: 'Missing authorization token' });
        }

        const claims = jwt.verify(token, config.jwtSecret);
        const db = getDb();
        const tokenHash = hashToken(token);
        const session = await db.collection('sessions').findOne({
            tokenHash,
            active: true,
            userId: claims.sub
        });

        if (!session) {
            return res.status(401).json({ status: 'error', message: 'Session is no longer active' });
        }

        req.auth = {
            token,
            tokenHash,
            session,
            userId: claims.sub,
            orgId: claims.orgId,
            branchId: claims.branchId || null,
            roles: claims.roles || []
        };
        return next();
    } catch (error) {
        return res.status(401).json({ status: 'error', message: 'Invalid or expired session' });
    }
}

function requireOrgScope(req, res, next) {
    const requestedOrgId = req.params.orgId || req.body?.orgId || req.query?.orgId;
    if (requestedOrgId && requestedOrgId !== req.auth?.orgId) {
        return res.status(403).json({ status: 'error', message: 'Organization scope mismatch' });
    }
    return next();
}

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin', 'owner']);
const MANAGER_ROLES = new Set(['manager', 'admin', 'superadmin', 'super_admin', 'owner']);
const SALES_ROLES = new Set(['cashier', 'sales', 'manager', 'admin', 'superadmin', 'super_admin', 'owner']);
const INVENTORY_ROLES = new Set(['inventory', 'stock_manager', 'manager', 'admin', 'superadmin', 'super_admin', 'owner']);

function hasAnyRole(auth, allowedRoles) {
    const roles = Array.isArray(auth?.roles) ? auth.roles : [];
    return roles.some((role) => allowedRoles.has(String(role || '').toLowerCase()));
}

function ownsUserScopedBody(req) {
    const targetUserId = req.body?.userId || req.body?.user_id || req.params?.id || req.query?.userId || req.query?.user_id;
    return targetUserId && String(targetUserId) === String(req.auth?.userId);
}

// Unlike ownsUserScopedBody() above, this only trusts req.params.id — the
// value Express actually matched from the URL to select which /users/:id
// record gets modified. ownsUserScopedBody() prefers req.body.userId, which
// the caller fully controls: a PATCH to /collections/users/<victim-id> with
// body.userId set to the attacker's own id would pass that check while
// modifying someone else's account. Used only for the users-collection
// self-update gate below, where req.params.id IS the target user record.
function isSelfUserRecord(req) {
    return Boolean(req.params?.id) && String(req.params.id) === String(req.auth?.userId);
}

function requireManagerRole(req, res, next) {
    if (hasAnyRole(req.auth, MANAGER_ROLES)) return next();
    return res.status(403).json({ status: 'error', message: 'This action requires manager access' });
}

function requireCatalogReadPermission(req, res, next) {
    const collection = req.params.collection;
    if (!collection) return next();
    if (hasAnyRole(req.auth, ADMIN_ROLES)) return next();

    const managerOnlyCollections = new Set([
        'users',
        'app_settings',
        'login_history'
    ]);
    const inventoryCollections = new Set([
        'categories',
        'units_of_measurement',
        'suppliers',
        'items',
        'stock_batches',
        'restock_transactions',
        'restock_items',
        'return_items',
        'inventory_transfers',
        'inventory_units',
        'stock_movements',
        'disposed_items'
    ]);
    const salesCollections = new Set([
        'sales',
        'sales_items',
        'returned_items',
        'members',
        'offers',
        'payment_methods',
        'tea_coop_members',
        'tea_coop_payments'
    ]);

    if (collection === 'user_settings') {
        if (ownsUserScopedBody(req) || hasAnyRole(req.auth, MANAGER_ROLES)) return next();
        return res.status(403).json({ status: 'error', message: 'You can only read your own settings' });
    }

    if (collection === 'branches') {
        if (hasAnyRole(req.auth, MANAGER_ROLES) || req.auth?.branchId) return next();
        return res.status(403).json({ status: 'error', message: 'Branch access requires an assigned branch' });
    }

    if (managerOnlyCollections.has(collection) && !hasAnyRole(req.auth, MANAGER_ROLES)) {
        return res.status(403).json({ status: 'error', message: 'This data requires manager access' });
    }

    if (inventoryCollections.has(collection) && !hasAnyRole(req.auth, INVENTORY_ROLES)) {
        return res.status(403).json({ status: 'error', message: 'This data requires inventory access' });
    }

    if (salesCollections.has(collection) && !hasAnyRole(req.auth, SALES_ROLES)) {
        return res.status(403).json({ status: 'error', message: 'This data requires sales access' });
    }

    return next();
}

function requireCatalogPermission(req, res, next) {
    if (req.method === 'GET') return next();

    const collection = req.params.collection;
    if (!collection) return next();
    if (hasAnyRole(req.auth, ADMIN_ROLES)) return next();

    const sensitiveCollections = new Set([
        'users',
        'app_settings',
        'branches',
        'payment_methods'
    ]);
    const inventoryCollections = new Set([
        'categories',
        'units_of_measurement',
        'suppliers',
        'items',
        'stock_batches',
        'restock_transactions',
        'restock_items',
        'return_items',
        'inventory_transfers',
        'inventory_units',
        'stock_movements',
        'disposed_items'
    ]);
    const salesCollections = new Set([
        'sales',
        'sales_items',
        'returned_items',
        'members',
        'offers'
    ]);

    if (collection === 'user_settings') {
        if (ownsUserScopedBody(req) || hasAnyRole(req.auth, MANAGER_ROLES)) return next();
        return res.status(403).json({ status: 'error', message: 'You can only update your own settings' });
    }

    if (collection === 'users' && isSelfUserRecord(req) && req.method === 'PATCH') {
        return next();
    }

    if (sensitiveCollections.has(collection) && !hasAnyRole(req.auth, MANAGER_ROLES)) {
        return res.status(403).json({ status: 'error', message: 'This action requires manager access' });
    }

    if (inventoryCollections.has(collection) && !hasAnyRole(req.auth, INVENTORY_ROLES)) {
        return res.status(403).json({ status: 'error', message: 'This action requires inventory access' });
    }

    if (salesCollections.has(collection) && !hasAnyRole(req.auth, SALES_ROLES)) {
        return res.status(403).json({ status: 'error', message: 'This action requires sales access' });
    }

    return next();
}

function requireSalesPermission(req, res, next) {
    if (hasAnyRole(req.auth, SALES_ROLES)) return next();
    return res.status(403).json({ status: 'error', message: 'This action requires sales access' });
}

function requireInventoryPermission(req, res, next) {
    if (hasAnyRole(req.auth, INVENTORY_ROLES)) return next();
    return res.status(403).json({ status: 'error', message: 'This action requires inventory access' });
}

module.exports = {
    requireAuth,
    requireOrgScope,
    requireCatalogReadPermission,
    requireCatalogPermission,
    requireSalesPermission,
    requireInventoryPermission,
    requireManagerRole,
    hasAnyRole,
    MANAGER_ROLES
};
