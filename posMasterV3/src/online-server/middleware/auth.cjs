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

module.exports = {
    requireAuth,
    requireOrgScope
};
