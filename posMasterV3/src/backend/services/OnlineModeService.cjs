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
        const result = await this.api.logout();
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
