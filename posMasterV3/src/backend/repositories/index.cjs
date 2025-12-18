/**
 * Repository Index
 *
 * Central export for all repositories.
 * Use this to import repositories throughout the application.
 */

const UserRepository = require('./UserRepository.cjs');
const SessionRepository = require('./SessionRepository.cjs');
const SyncQueueRepository = require('./SyncQueueRepository.cjs');
const LoginHistoryRepository = require('./LoginHistoryRepository.cjs');

// Singleton instances
let userRepository = null;
let sessionRepository = null;
let syncQueueRepository = null;
let loginHistoryRepository = null;

/**
 * Get User Repository instance (singleton)
 * @returns {UserRepository}
 */
function getUserRepository() {
    if (!userRepository) {
        userRepository = new UserRepository();
    }
    return userRepository;
}

/**
 * Get Session Repository instance (singleton)
 * @returns {SessionRepository}
 */
function getSessionRepository() {
    if (!sessionRepository) {
        sessionRepository = new SessionRepository();
    }
    return sessionRepository;
}

/**
 * Get Sync Queue Repository instance (singleton)
 * @returns {SyncQueueRepository}
 */
function getSyncQueueRepository() {
    if (!syncQueueRepository) {
        syncQueueRepository = new SyncQueueRepository();
    }
    return syncQueueRepository;
}

/**
 * Get Login History Repository instance (singleton)
 * @returns {LoginHistoryRepository}
 */
function getLoginHistoryRepository() {
    if (!loginHistoryRepository) {
        loginHistoryRepository = LoginHistoryRepository;
    }
    return loginHistoryRepository;
}

/**
 * Reset all repository instances (useful for testing)
 */
function resetRepositories() {
    userRepository = null;
    sessionRepository = null;
    syncQueueRepository = null;
    loginHistoryRepository = null;
}

module.exports = {
    UserRepository,
    SessionRepository,
    SyncQueueRepository,
    LoginHistoryRepository,
    getUserRepository,
    getSessionRepository,
    getSyncQueueRepository,
    getLoginHistoryRepository,
    resetRepositories
};
