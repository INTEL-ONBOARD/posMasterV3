/**
 * Repository Index
 *
 * Central export for all repositories.
 * Use this to import repositories throughout the application.
 */

const UserRepository = require('./UserRepository.cjs');
const SessionRepository = require('./SessionRepository.cjs');
const SyncQueueRepository = require('./SyncQueueRepository.cjs');

// Singleton instances
let userRepository = null;
let sessionRepository = null;
let syncQueueRepository = null;

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
 * Reset all repository instances (useful for testing)
 */
function resetRepositories() {
    userRepository = null;
    sessionRepository = null;
    syncQueueRepository = null;
}

module.exports = {
    UserRepository,
    SessionRepository,
    SyncQueueRepository,
    getUserRepository,
    getSessionRepository,
    getSyncQueueRepository,
    resetRepositories
};
