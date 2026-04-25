const { OnlineApiClient } = require('../online/OnlineApiClient.cjs');
const { OnlineRealtimeClient } = require('../online/OnlineRealtimeClient.cjs');
const { config } = require('../../online-server/config.cjs');
const { connectMongo, getDb } = require('../../online-server/db/mongo.cjs');

async function getConnectedDb() {
    try {
        return getDb();
    } catch {
        return connectMongo();
    }
}

class OnlineModeService {
    constructor() {
        this.api = new OnlineApiClient();
        this.realtime = new OnlineRealtimeClient();
    }

    getConfig() {
        return {
            apiUrl: this.api.baseUrl,
            realtimeUrl: this.realtime.baseUrl,
            onlineOnly: true
        };
    }

    async health() {
        return this.api.health();
    }

    async ready() {
        return this.api.ready();
    }

    async login(email, password, deviceInfo = null) {
        const result = await this.api.login(email, password, deviceInfo);
        if (result?.token) {
            this.realtime.connect(result.token);
        }
        return result;
    }

    async register(userData) {
        return this.api.register(userData);
    }

    async logout() {
        let result;
        try {
            result = await this.api.logout();
        } catch (error) {
            if (!error?.statusCode || error.statusCode >= 500 || error?.cause?.code === 'ECONNREFUSED' || error?.message === 'fetch failed') {
                result = { success: true, status: 'success', message: 'Logged out locally' };
            } else {
                throw error;
            }
        }
        this.realtime.disconnect();
        return result;
    }

    async validateSession() {
        return this.api.validateSession();
    }

    async list(collection, query = {}) {
        return this.api.list(collection, query);
    }

    async get(collection, id) {
        return this.api.get(collection, id);
    }

    async create(collection, data) {
        return this.api.create(collection, data);
    }

    async update(collection, id, data) {
        return this.api.update(collection, id, data);
    }

    async delete(collection, id) {
        return this.api.delete(collection, id);
    }

    async createSale(data) {
        return this.api.createSale(data);
    }

    async generateInvoiceNo(type = 'SALE') {
        return this.api.generateInvoiceNo(type);
    }

    async getSalesSummary(startDate, endDate) {
        const db = await getConnectedDb();
        const filter = {
            orgId: config.defaultOrgId
        };
        const dateRange = {};
        if (startDate) dateRange.$gte = new Date(startDate);
        if (endDate) dateRange.$lte = new Date(endDate);

        const pipeline = [
            {
                $addFields: {
                    effectiveCreatedAt: {
                        $ifNull: [
                            '$createdAt',
                            {
                                $cond: [
                                    { $ne: ['$created_at', null] },
                                    { $toDate: '$created_at' },
                                    null
                                ]
                            }
                        ]
                    }
                }
            },
            { $match: filter },
            ...(Object.keys(dateRange).length
                ? [{ $match: { effectiveCreatedAt: dateRange } }]
                : []),
            {
                $group: {
                    _id: null,
                    total_sales: { $sum: '$totalAmount' },
                    total_amount: { $sum: '$totalAmount' },
                    total_transactions: { $sum: 1 },
                    count: { $sum: 1 }
                }
            }
        ];

        const [summary] = await db.collection('sales').aggregate(pipeline).toArray();
        return {
            success: true,
            status: 'success',
            data: summary || {
                total_sales: 0,
                total_amount: 0,
                total_transactions: 0,
                count: 0
            }
        };
    }

    async getSalesDaily(days = 30) {
        const db = await getConnectedDb();
        const dayCount = Math.max(Number.parseInt(days, 10) || 30, 1);
        const start = new Date();
        start.setDate(start.getDate() - dayCount);
        const rows = await db.collection('sales').aggregate([
            {
                $addFields: {
                    effectiveCreatedAt: {
                        $ifNull: [
                            '$createdAt',
                            {
                                $cond: [
                                    { $ne: ['$created_at', null] },
                                    { $toDate: '$created_at' },
                                    null
                                ]
                            }
                        ]
                    }
                }
            },
            { $match: { orgId: config.defaultOrgId, effectiveCreatedAt: { $gte: start } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$effectiveCreatedAt' } },
                    total_amount: { $sum: '$totalAmount' },
                    total_sales: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        return { success: true, status: 'success', data: rows };
    }

    async getActiveSessions() {
        const db = await getConnectedDb();
        const sessions = await db.collection('sessions')
            .find({ active: true })
            .sort({ lastSeenAt: -1, createdAt: -1 })
            .toArray();
        return {
            success: true,
            status: 'success',
            data: sessions
        };
    }

    async countActiveSessions() {
        const db = await getConnectedDb();
        const count = await db.collection('sessions').countDocuments({ active: true });
        return {
            success: true,
            status: 'success',
            data: { count }
        };
    }

    getRealtimeStatus() {
        return this.realtime.getStatus();
    }
}

let onlineModeService = null;

function getOnlineModeService() {
    if (!onlineModeService) {
        onlineModeService = new OnlineModeService();
    }
    return onlineModeService;
}

module.exports = {
    OnlineModeService,
    getOnlineModeService
};
