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

    generateInvoiceNo(type = 'SALE') {
        return this.request('/sales/invoice-no', {
            method: 'POST',
            body: { type }
        });
    }
}

module.exports = { OnlineApiClient };
