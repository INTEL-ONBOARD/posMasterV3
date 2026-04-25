require('dotenv').config();

const bcrypt = require('bcryptjs');
const { config } = require('../src/online-server/config.cjs');
const { connectMongo, closeMongo } = require('../src/online-server/db/mongo.cjs');

async function main() {
    const db = await connectMongo();
    const email = (process.env.SEED_ADMIN_EMAIL || 'admin@posmaster.local').toLowerCase();
    const username = process.env.SEED_ADMIN_USERNAME || 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
    const orgId = process.env.SEED_ORG_ID || config.defaultOrgId;

    const now = new Date();
    await db.collection('organizations').updateOne(
        { _id: orgId },
        {
            $setOnInsert: {
                _id: orgId,
                name: 'Default Organization',
                createdAt: now
            },
            $set: { updatedAt: now }
        },
        { upsert: true }
    );

    const branch = await db.collection('branches').findOneAndUpdate(
        { orgId, name: 'Main Branch' },
        {
            $setOnInsert: {
                orgId,
                name: 'Main Branch',
                code: 'MAIN',
                createdAt: now,
                createdBy: 'system',
                deletedAt: null,
                version: 1
            },
            $set: {
                updatedAt: now,
                updatedBy: 'system'
            }
        },
        { upsert: true, returnDocument: 'after' }
    );

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.collection('users').updateOne(
        { orgId, email },
        {
            $setOnInsert: {
                orgId,
                email,
                username,
                fullName: 'System Administrator',
                roles: ['admin'],
                branchId: String(branch._id),
                createdAt: now,
                createdBy: 'system',
                deletedAt: null,
                version: 1
            },
            $set: {
                passwordHash,
                isActive: true,
                updatedAt: now,
                updatedBy: 'system'
            }
        },
        { upsert: true }
    );

    console.log(JSON.stringify({
        status: 'success',
        orgId,
        branchId: String(branch._id),
        email,
        username,
        password,
        inserted: result.upsertedCount === 1
    }, null, 2));
}

main()
    .catch((error) => {
        console.error('[SeedOnlineAdmin] Failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closeMongo();
    });
