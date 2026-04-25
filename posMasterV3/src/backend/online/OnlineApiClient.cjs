class OnlineApiClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || process.env.POS_ONLINE_API_URL || 'http://localhost:4100/api';
        this.token = options.token || null;
    }

    setToken(token) {
        this.token = token || null;
    }

    getToken() {
        return this.token;
    }

    async request(path, options = {}) {
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        if (this.token) headers.Authorization = `Bearer ${this.token}`;

        const response = await fetch(url, {
            ...options,
            headers,
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
            throw error;
        }
        return payload;
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

    validateSession() {
        return this.request('/auth/session');
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
