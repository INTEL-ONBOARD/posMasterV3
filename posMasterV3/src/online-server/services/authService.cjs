const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { config } = require('../config.cjs');
const { getDb } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');
const { hashToken, publicUser } = require('../utils/security.cjs');

function normalizeLogin(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeBranchId(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value);
        }
    }
    return null;
}

function roleRequiresBranch(roles = []) {
    return roles.some((role) => ['cashier', 'assistant', 'user'].includes(String(role).toLowerCase()));
}

async function register(body = {}, auth = null) {
    const db = getDb();
    const now = new Date();
    const email = normalizeLogin(body.email);
    const username = normalizeLogin(body.username || email);
    const password = body.password || body.newPassword;
    const roles = Array.isArray(body.roles) && body.roles.length ? body.roles : ['cashier'];
    const branchId = normalizeBranchId(body.branchId, body.branch_id, auth?.branchId, auth?.branch_id);

    if (!email || !username || !password) {
        const err = new Error('Email, username, and password are required');
        err.statusCode = 400;
        throw err;
    }

    if (roleRequiresBranch(roles) && !branchId) {
        const err = new Error('Branch is required for cashier users');
        err.statusCode = 400;
        throw err;
    }

    const orgId = auth?.orgId || body.orgId || config.defaultOrgId;
    const existing = await db.collection('users').findOne({
        orgId,
        deletedAt: null,
        $or: [{ email }, { username }]
    });
    if (existing) {
        const err = new Error('A user with this email or username already exists');
        err.statusCode = 409;
        throw err;
    }

    const isActive = body.isActive !== false && body.is_active !== false;
    const user = {
        ...body,
        orgId,
        branchId,
        branch_id: branchId,
        email,
        username,
        passwordHash: await bcrypt.hash(password, 12),
        roles,
        isActive,
        is_active: isActive,
        createdAt: now,
        updatedAt: now,
        createdBy: auth?.userId || null,
        updatedBy: auth?.userId || null,
        version: 1,
        deletedAt: null
    };
    delete user.password;
    delete user.newPassword;
    delete user.confirmPassword;

    const result = await db.collection('users').insertOne(user);
    const inserted = { ...user, _id: result.insertedId };

    await publishDomainEvent({
        event: 'users.created',
        orgId,
        branchId: inserted.branchId || null,
        userId: String(result.insertedId),
        entity: 'users',
        entityId: String(result.insertedId),
        operation: 'create',
        changedBy: auth?.userId || String(result.insertedId)
    });

    return {
        success: true,
        status: 'success',
        message: 'User registered',
        data: publicUser(inserted)
    };
}

async function login({ email, password, deviceInfo = null }) {
    const db = getDb();
    const loginValue = normalizeLogin(email);
    const user = await db.collection('users').findOne({
        orgId: config.defaultOrgId,
        $or: [{ email: loginValue }, { username: loginValue }],
        deletedAt: null
    });

    if (!user || user.isActive === false || user.is_active === false) {
        return { success: false, status: 'error', message: 'Invalid credentials' };
    }

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) {
        return { success: false, status: 'error', message: 'Invalid credentials' };
    }

    const sessionVersion = Date.now();
    await db.collection('sessions').updateMany(
        { userId: String(user._id), active: true },
        { $set: { active: false, endedAt: new Date(), endReason: 'replaced_by_new_login' } }
    );

    const branchId = normalizeBranchId(user.branchId, user.branch_id);

    const token = jwt.sign(
        {
            sub: String(user._id),
            orgId: user.orgId,
            branchId,
            roles: user.roles || [],
            sessionVersion
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );

    const session = {
        userId: String(user._id),
        orgId: user.orgId,
        branchId,
        tokenHash: hashToken(token),
        active: true,
        deviceInfo,
        sessionVersion,
        createdAt: new Date(),
        lastSeenAt: new Date()
    };

    await db.collection('sessions').insertOne(session);
    await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: new Date(), updatedAt: new Date(), branchId, branch_id: branchId } }
    );

    await publishDomainEvent({
        event: 'session.replaced',
        orgId: user.orgId,
        branchId,
        userId: String(user._id),
        entity: 'sessions',
        operation: 'replace',
        changedBy: String(user._id)
    });

    return {
        success: true,
        status: 'success',
        message: 'Login successful',
        token,
        data: publicUser({ ...user, branchId, branch_id: branchId, lastLoginAt: new Date() })
    };
}

async function validateSession(token) {
    try {
        const claims = jwt.verify(token, config.jwtSecret);
        const tokenHash = hashToken(token);
        const db = getDb();
        const session = await db.collection('sessions').findOne({
            userId: claims.sub,
            tokenHash,
            active: true
        });
        if (!session) return { valid: false, message: 'Session inactive' };

        await db.collection('sessions').updateOne(
            { _id: session._id },
            { $set: { lastSeenAt: new Date() } }
        );

        return { valid: true, claims, session };
    } catch {
        return { valid: false, message: 'Invalid or expired session' };
    }
}

async function logout(token) {
    const sessionResult = await validateSession(token);
    if (!sessionResult.valid) {
        return { success: true, status: 'success', message: 'Already logged out' };
    }

    const db = getDb();
    await db.collection('sessions').updateOne(
        { _id: new ObjectId(sessionResult.session._id) },
        { $set: { active: false, endedAt: new Date(), endReason: 'logout' } }
    );

    await publishDomainEvent({
        event: 'session.logged_out',
        orgId: sessionResult.claims.orgId,
        branchId: sessionResult.claims.branchId || null,
        userId: sessionResult.claims.sub,
        entity: 'sessions',
        operation: 'update',
        changedBy: sessionResult.claims.sub
    });

    return { success: true, status: 'success', message: 'Logged out' };
}

async function changePassword(auth, body = {}) {
    const db = getDb();
    const userId = auth?.userId;
    const currentPassword = body.currentPassword || body.current_password || '';
    const newPassword = body.newPassword || body.new_password || body.password || '';

    if (!userId || !currentPassword || !newPassword) {
        const err = new Error('Current password and new password are required');
        err.statusCode = 400;
        throw err;
    }

    const user = await db.collection('users').findOne({
        _id: new ObjectId(userId),
        orgId: auth.orgId,
        deletedAt: null
    });

    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!ok) {
        const err = new Error('Current password is incorrect');
        err.statusCode = 401;
        throw err;
    }

    await db.collection('users').updateOne(
        { _id: user._id },
        {
            $set: {
                passwordHash: await bcrypt.hash(newPassword, 12),
                updatedAt: new Date(),
                updatedBy: auth.userId
            }
        }
    );

    return {
        success: true,
        status: 'success',
        message: 'Password updated'
    };
}

async function resetPassword(auth, targetUserId, newPassword) {
    const db = getDb();
    if (!targetUserId || !newPassword) {
        const err = new Error('User ID and new password are required');
        err.statusCode = 400;
        throw err;
    }

    const allowed = Array.isArray(auth?.roles) && (auth.roles.includes('admin') || auth.roles.includes('manager'));
    if (!allowed && String(auth?.userId) !== String(targetUserId)) {
        const err = new Error('Not authorized to reset this password');
        err.statusCode = 403;
        throw err;
    }

    const user = await db.collection('users').findOne({
        _id: new ObjectId(targetUserId),
        orgId: auth.orgId,
        deletedAt: null
    });

    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }

    await db.collection('users').updateOne(
        { _id: user._id },
        {
            $set: {
                passwordHash: await bcrypt.hash(newPassword, 12),
                updatedAt: new Date(),
                updatedBy: auth.userId
            }
        }
    );

    return {
        success: true,
        status: 'success',
        message: 'Password reset'
    };
}

module.exports = {
    register,
    login,
    validateSession,
    logout,
    changePassword,
    resetPassword
};
