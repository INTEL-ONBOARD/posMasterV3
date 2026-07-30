const fs = require('fs');
const { Agent } = require('undici');

// When the central server uses a self-signed cert, POS_TLS_CA_FILE points at
// the internal CA we bundle with the app. Build one undici dispatcher that
// trusts that CA and reuse it for every request. We trust the specific CA
// only — never a blanket rejectUnauthorized:false. Resolves to undefined when
// no CA is configured (plain HTTP / system-trusted TLS), so fetch behaves
// exactly as before.
let _caDispatcher;
function getCaDispatcher() {
    if (_caDispatcher !== undefined) return _caDispatcher || undefined;
    const caFile = process.env.POS_TLS_CA_FILE;
    try {
        _caDispatcher = caFile && fs.existsSync(caFile)
            ? new Agent({ connect: { ca: fs.readFileSync(caFile) } })
            : false;
    } catch {
        _caDispatcher = false;
    }
    return _caDispatcher || undefined;
}

class OnlineApiClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || process.env.POS_ONLINE_API_URL || 'http://localhost:4100/api';
        this.token = options.token || null;
    }

    static _isTransientFetchError(error) {
        const code = error?.cause?.code || error?.code || error?.statusCode;
        return code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNRESET' || error?.message === 'fetch failed';
    }

    static _sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    static _retryDelay(attempt) {
        return Math.min(250 * (2 ** attempt), 1500);
    }

    setToken(token) {
        this.token = token || null;
    }

    getToken() {
        return this.token;
    }

    async request(path, options = {}) {
        const method = String(options.method || 'GET').toUpperCase();
        const maxRetries = options.retries ?? (method === 'GET' || method === 'HEAD' ? 2 : 0);
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const requestToken = options.token || this.token;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        if (requestToken) headers.Authorization = `Bearer ${requestToken}`;

        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers,
                    method,
                    dispatcher: getCaDispatcher(),
                    body: options.body && typeof options.body !== 'string'
                        ? JSON.stringify(options.body)
                        : options.body
                });

                const text = await response.text();
                const payload = text ? JSON.parse(text) : null;
                if (!response.ok) {
                    const error = new Error(payload?.message || `Online API request failed: ${response.status}`);
                    error.statusCode = response.status;
                    error.payload = payload;
                    if (response.status >= 500 && attempt < maxRetries) {
                        lastError = error;
                        await OnlineApiClient._sleep(OnlineApiClient._retryDelay(attempt));
                        continue;
                    }
                    throw error;
                }
                return payload;
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries && OnlineApiClient._isTransientFetchError(error)) {
                    await OnlineApiClient._sleep(OnlineApiClient._retryDelay(attempt));
                    continue;
                }
                throw error;
            }
        }

        throw lastError || new Error('Online API request failed');
    }

    health() {
        return this.request('/health');
    }

    ready() {
        return this.request('/ready');
    }

    getSalesSummary({ startDate, endDate } = {}) {
        const q = new URLSearchParams();
        if (startDate) q.set('startDate', startDate);
        if (endDate) q.set('endDate', endDate);
        const suffix = q.toString() ? `?${q}` : '';
        return this.request(`/sales/summary${suffix}`);
    }

    getSalesDaily(days = 30) {
        return this.request(`/sales/daily?days=${encodeURIComponent(days)}`);
    }

    getActiveSessions(limit = 100, skip = 0) {
        return this.request(`/sessions/active?limit=${encodeURIComponent(limit)}&skip=${encodeURIComponent(skip)}`);
    }

    countActiveSessions() {
        return this.request('/sessions/active/count');
    }

    async login(email, password, deviceInfo = null) {
        const result = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password, deviceInfo }
        });
        if (result?.token) this.setToken(result.token);
        return result;
    }

    register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
    }

    async logout() {
        try {
            return await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.setToken(null);
        }
    }

    validateSession(token = null) {
        return this.request('/auth/session', token ? { token } : {});
    }

    changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        });
    }

    resetPassword(userId, newPassword) {
        return this.request(`/users/${userId}/reset-password`, {
            method: 'POST',
            body: { newPassword }
        });
    }

    list(collection, query = {}) {
        const params = new URLSearchParams(query);
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/collections/${collection}${suffix}`);
    }

    get(collection, id) {
        return this.request(`/collections/${collection}/${id}`);
    }

    create(collection, data) {
        return this.request(`/collections/${collection}`, {
            method: 'POST',
            body: data
        });
    }

    update(collection, id, data) {
        return this.request(`/collections/${collection}/${id}`, {
            method: 'PATCH',
            body: data
        });
    }

    delete(collection, id) {
        return this.request(`/collections/${collection}/${id}`, {
            method: 'DELETE'
        });
    }

    createSale(data) {
        return this.request('/sales', {
            method: 'POST',
            body: data
        });
    }

    completeHeldSale(id, data = {}) {
        return this.request(`/sales/${id}/complete-held`, {
            method: 'POST',
            body: data
        });
    }

    cancelSale(id, data = {}) {
        return this.request(`/sales/${id}/cancel`, {
            method: 'POST',
            body: data
        });
    }

    returnSaleItems(id, data = {}) {
        return this.request(`/sales/${id}/return-items`, {
            method: 'POST',
            body: data
        });
    }

    acceptInventoryTransfer(id, data = {}) {
        return this.request(`/inventory-transfers/${id}/accept`, {
            method: 'POST',
            body: data
        });
    }

    rejectInventoryTransfer(id, data = {}) {
        return this.request(`/inventory-transfers/${id}/reject`, {
            method: 'POST',
            body: data
        });
    }

    generateInvoiceNo(type = 'SALE', branchId = null) {
        return this.request('/sales/invoice-no', {
            method: 'POST',
            body: { type, branchId, branch_id: branchId }
        });
    }

    syncTeaCoop(options = {}) {
        return this.request('/tea-coop/sync', {
            method: 'POST',
            body: options
        });
    }

    syncTeaCoopMembers() {
        return this.request('/tea-coop/sync/members', {
            method: 'POST',
            body: {}
        });
    }

    syncTeaCoopPayments(memberId = null, options = {}) {
        return this.request('/tea-coop/sync/payments', {
            method: 'POST',
            body: { ...options, memberId, member_id: memberId }
        });
    }

    getTeaCoopStatus() {
        return this.request('/tea-coop/status');
    }
}

module.exports = { OnlineApiClient };
