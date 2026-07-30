const { OnlineApiClient } = require('../online/OnlineApiClient.cjs');
const { OnlineRealtimeClient } = require('../online/OnlineRealtimeClient.cjs');

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

    async validateSession(token = null) {
        return this.api.validateSession(token);
    }

    setToken(token) {
        this.api.setToken(token);
        return { success: true, status: 'success' };
    }

    async changePassword(currentPassword, newPassword) {
        return this.api.changePassword(currentPassword, newPassword);
    }

    async resetPassword(userId, newPassword) {
        return this.api.resetPassword(userId, newPassword);
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

    async completeHeldSale(saleId, updateData = {}) {
        return this.api.completeHeldSale(saleId, updateData);
    }

    async cancelSale(saleId, data = {}) {
        return this.api.cancelSale(saleId, data);
    }

    async returnSaleItems(saleId, data = {}) {
        return this.api.returnSaleItems(saleId, data);
    }

    async acceptInventoryTransfer(transferId, data = {}) {
        return this.api.acceptInventoryTransfer(transferId, data);
    }

    async rejectInventoryTransfer(transferId, data = {}) {
        return this.api.rejectInventoryTransfer(transferId, data);
    }

    async generateInvoiceNo(type = 'SALE', branchId = null) {
        return this.api.generateInvoiceNo(type, branchId);
    }

    async syncTeaCoop(options = {}) {
        return this.api.syncTeaCoop(options);
    }

    async syncTeaCoopMembers() {
        return this.api.syncTeaCoopMembers();
    }

    async syncTeaCoopPayments(memberId = null, options = {}) {
        return this.api.syncTeaCoopPayments(memberId, options);
    }

    async getTeaCoopStatus() {
        return this.api.getTeaCoopStatus();
    }

    // Reports/session queries go through the central REST API
    // (routes/reports.cjs). The desktop no longer touches MongoDB directly, so
    // it needs no DB connection, JWT secret, or DB credentials of its own.
    async getSalesSummary(startDate, endDate) {
        return this.api.getSalesSummary({ startDate, endDate });
    }

    async getSalesDaily(days = 30) {
        return this.api.getSalesDaily(days);
    }

    async getActiveSessions(limit = 100, skip = 0) {
        return this.api.getActiveSessions(limit, skip);
    }

    async countActiveSessions() {
        return this.api.countActiveSessions();
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
