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
const ActiveSessionRepository = require('./ActiveSessionRepository.cjs');

// Singleton instances
let userRepository = null;
let sessionRepository = null;
let syncQueueRepository = null;
let loginHistoryRepository = null;
let activeSessionRepository = null;

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
        loginHistoryRepository = new LoginHistoryRepository();
    }
    return loginHistoryRepository;
}

/**
 * Get Active Session Repository instance (singleton)
 * @returns {ActiveSessionRepository}
 */
function getActiveSessionRepository() {
    if (!activeSessionRepository) {
        activeSessionRepository = new ActiveSessionRepository();
    }
    return activeSessionRepository;
}

/**
 * Reset all repository instances (useful for testing)
 */
function resetRepositories() {
    userRepository = null;
    sessionRepository = null;
    syncQueueRepository = null;
    loginHistoryRepository = null;
    activeSessionRepository = null;
}

module.exports = {
    UserRepository,
    SessionRepository,
    SyncQueueRepository,
    LoginHistoryRepository,
    ActiveSessionRepository,
    getUserRepository,
    getSessionRepository,
    getSyncQueueRepository,
    getLoginHistoryRepository,
    getActiveSessionRepository,
    resetRepositories
};
