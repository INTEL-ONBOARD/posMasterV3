/**
 * Tea Coop Service
 *
 * Handles fetching data from Tea Coop external API and syncing with local database.
 * Runs background sync in a non-blocking manner.
 */

const axios = require('axios');
const { getTeaCoopMemberRepository, getTeaCoopPaymentRepository } = require('../repositories/TeaCoopRepository.cjs');
const { broadcastDataChange, broadcastEvent } = require('../utils/eventBroadcaster.cjs');
const { nowISO } = require('../utils/helpers.cjs');

// Tea Coop API Configuration
const TEA_COOP_API_BASE = 'https://api.teacoop.lk/api/v1';
const TEA_COOP_AUTH_URL = `${TEA_COOP_API_BASE}/thirdPartyLogin`;
const TEA_COOP_CREDENTIALS = {
    username: 'teacoop@codehub.lk',
    password: 'teacoop@1234'
};
const DEFAULT_FACTORY_ID = 1;
const DEFAULT_PAGE_SIZE = 100;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh token 5 minutes before expiry

class TeaCoopService {
    constructor() {
        this.memberRepo = null;
        this.paymentRepo = null;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncInterval = null;
        this.isInitialized = false;

        // Authentication state
        this.accessToken = null;
        this.tokenExpiry = null;
        this.isAuthenticating = false;
    }

    /**
     * Initialize repositories (lazy loading)
     */
    _initRepos() {
        if (!this.memberRepo) {
            this.memberRepo = getTeaCoopMemberRepository();
        }
        if (!this.paymentRepo) {
            this.paymentRepo = getTeaCoopPaymentRepository();
        }
    }

    /**
     * Authenticate with Tea Coop API and get access token
     * @returns {Promise<string|null>} Access token or null if failed
     */
    async authenticate() {
        // Prevent concurrent authentication attempts
        if (this.isAuthenticating) {
            // Wait for ongoing authentication to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.accessToken;
        }

        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiry) {
            const now = Date.now();
            if (now < this.tokenExpiry - TOKEN_REFRESH_BUFFER_MS) {
                return this.accessToken;
            }
        }

        this.isAuthenticating = true;

        try {
            console.log('[TeaCoopService] Authenticating with Tea Coop API...');

            const response = await axios.post(TEA_COOP_AUTH_URL, TEA_COOP_CREDENTIALS, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            // Extract token from response
            // Adjust based on actual API response structure
            const data = response.data;
            const token = data.token || data.accessToken || data.access_token || data.data?.token;

            if (token) {
                this.accessToken = token;
                // Set expiry to 1 hour from now (adjust based on actual token expiry)
                this.tokenExpiry = Date.now() + (60 * 60 * 1000);
                console.log('[TeaCoopService] Authentication successful');
                return this.accessToken;
            } else {
                console.error('[TeaCoopService] No token in response:', data);
                return null;
            }
        } catch (error) {
            console.error('[TeaCoopService] Authentication failed:', error.message);
            if (error.response) {
                console.error('[TeaCoopService] Response status:', error.response.status);
                console.error('[TeaCoopService] Response data:', error.response.data);
            }
            return null;
        } finally {
            this.isAuthenticating = false;
        }
    }

    /**
     * Get axios config with authentication headers
     * @returns {Promise<Object>} Axios request config
     */
    async _getAuthConfig() {
        const token = await this.authenticate();
        if (!token) {
            throw new Error('Failed to authenticate with Tea Coop API');
        }

        return {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        };
    }

    /**
     * Initialize the service and start background sync
     */
    async initialize() {
        if (this.isInitialized) return;

        this._initRepos();
        this.isInitialized = true;

        // Authenticate first
        await this.authenticate();

        // Start background sync
        this.startBackgroundSync();

        // Do initial sync
        this.syncMembersFromApi().catch(err => {
            console.error('[TeaCoopService] Initial sync failed:', err.message);
        });

        console.log('[TeaCoopService] Initialized');
    }

    /**
     * Start background sync interval
     */
    startBackgroundSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(async () => {
            if (!this.isSyncing) {
                await this.syncMembersFromApi().catch(err => {
                    console.error('[TeaCoopService] Background sync failed:', err.message);
                });
            }
        }, SYNC_INTERVAL_MS);

        console.log('[TeaCoopService] Background sync started (interval: 5 minutes)');
    }

    /**
     * Stop background sync
     */
    stopBackgroundSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Fetch members from Tea Coop API
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<Object>}
     */
    async fetchMembersFromApi(page = 1, limit = DEFAULT_PAGE_SIZE) {
        try {
            const config = await this._getAuthConfig();
            const url = `${TEA_COOP_API_BASE}/members/thirdparty-all-members-current-month`;
            const response = await axios.get(url, {
                ...config,
                params: { page, limit }
            });

            // API response format: { success: true, data: { members: [...] } }
            // Each member: { member: { memberNumber, nameWithInitials, ... }, totals: { greenLeafValue, loans, netAmount } }
            const rawMembers = response.data?.data?.members || [];

            // Transform API format to our internal format
            const members = rawMembers.map(item => ({
                memberId: item.member?.memberNumber,
                member_id: item.member?.memberNumber,
                memberNo: item.member?.memberNumber,
                member_no: item.member?.memberNumber,
                fullName: item.member?.nameWithInitials || `Member ${item.member?.memberNumber}`,
                full_name: item.member?.nameWithInitials || `Member ${item.member?.memberNumber}`,
                name: item.member?.nameWithInitials || `Member ${item.member?.memberNumber}`,
                contact: item.member?.phoneNumber || null,
                phone: item.member?.phoneNumber || null,
                memberType: item.member?.memberType,
                status: item.member?.status,
                lineName: item.member?.lineName,
                greenLeafValue: item.totals?.greenLeafValue || 0,
                loans: item.totals?.loans || 0,
                netAmount: item.totals?.netAmount || 0,
                additions: item.totals?.additions || 0,
                deductions: item.totals?.deductions || 0
            }));

            console.log(`[TeaCoopService] Extracted ${members.length} members from response`);

            return {
                success: true,
                data: members,
                pagination: response.data?.pagination || { page, limit, total: members.length }
            };
        } catch (error) {
            console.error('[TeaCoopService] API fetch error:', error.message);
            // If unauthorized, clear token to force re-auth on next attempt
            if (error.response?.status === 401 || error.response?.status === 403) {
                this.accessToken = null;
                this.tokenExpiry = null;
            }
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Fetch payment history for a member
     * @param {string} memberId - Member ID
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>}
     */
    async fetchPaymentHistory(memberId, options = {}) {
        const {
            monthLimit = 6,
            factory = DEFAULT_FACTORY_ID
        } = options;

        // Calculate the start date to be 6 months AGO (to get historical data, not future)
        const now = new Date();
        const pastDate = new Date(now.getFullYear(), now.getMonth() - monthLimit + 1, 1);
        const startYear = options.startYear || pastDate.getFullYear();
        const startMonth = options.startMonth || (pastDate.getMonth() + 1);

        console.log(`[TeaCoopService] Fetching payment history for member ${memberId}: startYear=${startYear}, startMonth=${startMonth}, monthLimit=${monthLimit}`);

        try {
            const config = await this._getAuthConfig();
            const url = `${TEA_COOP_API_BASE}/members/${memberId}/thirdparty-monthly-payment`;
            const response = await axios.get(url, {
                ...config,
                params: { startYear, startMonth, monthLimit, factory }
            });

            // API response format: { success: true, data: { member: {...}, monthlyData: [...] } }
            // Each monthlyData: { year, month, monthName, totals: { greenLeafValue, loans, netAmount } }
            console.log(`[TeaCoopService] Raw API response for member ${memberId}:`, JSON.stringify(response.data, null, 2));

            const rawPayments = response.data?.data?.monthlyData || [];
            console.log(`[TeaCoopService] Raw payments data:`, JSON.stringify(rawPayments.slice(0, 2), null, 2));

            // Transform API format to our internal format
            const payments = rawPayments.map(item => {
                // Log the structure of each item to debug field mapping
                if (rawPayments.indexOf(item) === 0) {
                    console.log(`[TeaCoopService] First payment item structure:`, JSON.stringify(item, null, 2));
                }
                return {
                    year: item.year,
                    month: item.month,
                    monthName: item.monthName,
                    greenLeafValue: item.totals?.greenLeafValue || item.greenLeafValue || 0,
                    green_leaf_value: item.totals?.greenLeafValue || item.greenLeafValue || 0,
                    loans: item.totals?.loans || item.loans || 0,
                    netAmount: item.totals?.netAmount || item.netAmount || 0,
                    net_amount: item.totals?.netAmount || item.netAmount || 0,
                    additions: item.totals?.additions || item.additions || 0,
                    deductions: item.totals?.deductions || item.deductions || 0
                };
            });

            console.log(`[TeaCoopService] Extracted ${payments.length} payment records for member ${memberId}`);
            if (payments.length > 0) {
                console.log(`[TeaCoopService] First transformed payment:`, JSON.stringify(payments[0], null, 2));
            }

            return {
                success: true,
                data: payments
            };
        } catch (error) {
            console.error('[TeaCoopService] Payment history fetch error:', error.message);
            // If unauthorized, clear token to force re-auth on next attempt
            if (error.response?.status === 401 || error.response?.status === 403) {
                this.accessToken = null;
                this.tokenExpiry = null;
            }
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Sync members from API to local database
     * @returns {Promise<Object>}
     */
    async syncMembersFromApi() {
        if (this.isSyncing) {
            return { success: false, message: 'Sync already in progress' };
        }

        this._initRepos();
        this.isSyncing = true;

        const result = {
            success: true,
            totalFetched: 0,
            inserted: 0,
            updated: 0,
            errors: []
        };

        try {
            broadcastEvent('teacoop:sync:started', { type: 'members' });

            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const apiResult = await this.fetchMembersFromApi(page, DEFAULT_PAGE_SIZE);

                if (!apiResult.success || apiResult.data.length === 0) {
                    hasMore = false;
                    if (!apiResult.success) {
                        result.errors.push(apiResult.error);
                    }
                    continue;
                }

                result.totalFetched += apiResult.data.length;

                // Bulk upsert to local database
                const upsertResult = this.memberRepo.bulkUpsertFromApi(apiResult.data);
                result.inserted += upsertResult.inserted;
                result.updated += upsertResult.updated;
                result.errors.push(...upsertResult.errors);

                // Check if we should fetch more
                if (apiResult.data.length < DEFAULT_PAGE_SIZE) {
                    hasMore = false;
                } else {
                    page++;
                }

                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.lastSyncTime = nowISO();

            broadcastEvent('teacoop:sync:completed', {
                type: 'members',
                result: {
                    totalFetched: result.totalFetched,
                    inserted: result.inserted,
                    updated: result.updated
                }
            });

            // Broadcast data change to refresh UI
            if (result.inserted > 0 || result.updated > 0) {
                broadcastDataChange('tea_coop_members', 'BATCH', null, {
                    inserted: result.inserted,
                    updated: result.updated
                });
            }

            console.log(`[TeaCoopService] Sync completed: ${result.totalFetched} fetched, ${result.inserted} inserted, ${result.updated} updated`);

        } catch (error) {
            result.success = false;
            result.errors.push(error.message);
            console.error('[TeaCoopService] Sync error:', error.message);

            broadcastEvent('teacoop:sync:error', { type: 'members', error: error.message });
        } finally {
            this.isSyncing = false;
        }

        return result;
    }

    /**
     * Sync payment history for a specific member
     * @param {string} memberId - Member ID
     * @param {Object} options - Sync options
     * @returns {Promise<Object>}
     */
    async syncMemberPayments(memberId, options = {}) {
        this._initRepos();

        const result = {
            success: true,
            memberId,
            totalFetched: 0,
            inserted: 0,
            updated: 0,
            errors: []
        };

        try {
            const apiResult = await this.fetchPaymentHistory(memberId, options);

            if (!apiResult.success) {
                return {
                    success: false,
                    error: apiResult.error,
                    data: []
                };
            }

            result.totalFetched = apiResult.data.length;

            // Bulk upsert payments
            if (apiResult.data.length > 0) {
                const upsertResult = this.paymentRepo.bulkUpsertFromApi(memberId, apiResult.data);
                result.inserted = upsertResult.inserted;
                result.updated = upsertResult.updated;
                result.errors = upsertResult.errors;
            }

            console.log(`[TeaCoopService] Payment sync for ${memberId}: ${result.totalFetched} fetched`);

        } catch (error) {
            result.success = false;
            result.errors.push(error.message);
            console.error('[TeaCoopService] Payment sync error:', error.message);
        }

        return result;
    }

    /**
     * Get all members from local database
     * @returns {Object}
     */
    getAllMembers() {
        this._initRepos();

        try {
            const members = this.memberRepo.findActive();
            return {
                success: true,
                status: 'success',
                data: members
            };
        } catch (error) {
            console.error('[TeaCoopService] Get members error:', error.message);
            return {
                success: false,
                status: 'error',
                message: error.message,
                data: []
            };
        }
    }

    /**
     * Get member by ID with latest payment info
     * @param {string} memberId - Member ID
     * @returns {Object}
     */
    getMemberById(memberId) {
        this._initRepos();

        try {
            const member = this.memberRepo.findByMemberId(memberId);
            if (!member) {
                return {
                    success: false,
                    status: 'error',
                    message: 'Member not found'
                };
            }

            return {
                success: true,
                status: 'success',
                data: member
            };
        } catch (error) {
            console.error('[TeaCoopService] Get member error:', error.message);
            return {
                success: false,
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get payment history for a member
     * First fetches from external API and saves to local DB, then returns the data
     * @param {string} memberId - Member ID
     * @param {number} months - Number of months
     * @returns {Promise<Object>}
     */
    async getPaymentHistory(memberId, months = 6) {
        this._initRepos();

        try {
            // First, sync payments from external API
            console.log(`[TeaCoopService] Fetching payment history for member ${memberId} from API...`);
            await this.syncMemberPayments(memberId, { monthLimit: months });

            // Then return data from local database
            const payments = this.paymentRepo.findByMemberId(memberId, months);
            console.log(`[TeaCoopService] Returning ${payments.length} payment records for member ${memberId}`);
            return {
                success: true,
                status: 'success',
                data: payments
            };
        } catch (error) {
            console.error('[TeaCoopService] Get payments error:', error.message);
            // Even if API fetch fails, try to return cached local data
            try {
                const cachedPayments = this.paymentRepo.findByMemberId(memberId, months);
                if (cachedPayments.length > 0) {
                    console.log(`[TeaCoopService] Returning ${cachedPayments.length} cached payment records`);
                    return {
                        success: true,
                        status: 'success',
                        data: cachedPayments,
                        cached: true
                    };
                }
            } catch (cacheError) {
                // Ignore cache error
            }
            return {
                success: false,
                status: 'error',
                message: error.message,
                data: []
            };
        }
    }

    /**
     * Search members
     * @param {string} searchTerm - Search term
     * @returns {Object}
     */
    searchMembers(searchTerm) {
        this._initRepos();

        try {
            const members = this.memberRepo.search(searchTerm);
            return {
                success: true,
                status: 'success',
                data: members
            };
        } catch (error) {
            console.error('[TeaCoopService] Search error:', error.message);
            return {
                success: false,
                status: 'error',
                message: error.message,
                data: []
            };
        }
    }

    /**
     * Force refresh member and their payments from API
     * @param {string} memberId - Member ID
     * @returns {Promise<Object>}
     */
    async refreshMemberData(memberId) {
        this._initRepos();

        try {
            // Fetch fresh payment history
            const paymentResult = await this.syncMemberPayments(memberId, {
                startYear: new Date().getFullYear(),
                startMonth: new Date().getMonth() + 1,
                monthLimit: 6
            });

            // Get updated member from local DB
            const member = this.memberRepo.findByMemberId(memberId);
            const payments = this.paymentRepo.findByMemberId(memberId, 6);

            // Update member with latest payment data if available
            if (payments.length > 0) {
                const latestPayment = payments[0];
                this.memberRepo.update(member.id, {
                    green_leaf_value: latestPayment.green_leaf_value,
                    additions: latestPayment.additions,
                    deductions: latestPayment.deductions,
                    loans: latestPayment.loans,
                    net_amount: latestPayment.net_amount
                });
            }

            return {
                success: true,
                status: 'success',
                data: {
                    member: this.memberRepo.findByMemberId(memberId),
                    payments
                }
            };
        } catch (error) {
            console.error('[TeaCoopService] Refresh error:', error.message);
            return {
                success: false,
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Get sync status
     * @returns {Object}
     */
    getStatus() {
        return {
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            isInitialized: this.isInitialized
        };
    }
}

// Singleton instance
let teaCoopServiceInstance = null;

function getTeaCoopService() {
    if (!teaCoopServiceInstance) {
        teaCoopServiceInstance = new TeaCoopService();
    }
    return teaCoopServiceInstance;
}

module.exports = {
    TeaCoopService,
    getTeaCoopService
};
