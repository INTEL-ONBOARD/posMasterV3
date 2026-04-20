const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const { initializeDatabase, closeDatabase, getDatabase } = require('../src/backend/database/connection.cjs');
const { runMigrations } = require('../src/backend/database/migrator.cjs');
const AuthService = require('../src/backend/services/AuthService.cjs');
const SessionRepository = require('../src/backend/repositories/SessionRepository.cjs');
const ActiveSessionRepository = require('../src/backend/repositories/ActiveSessionRepository.cjs');
const SyncQueueRepository = require('../src/backend/repositories/SyncQueueRepository.cjs');
const { getCloudSyncService } = require('../src/backend/services/CloudSyncService.cjs');
const sessionValidator = require('../src/backend/services/SessionValidator.cjs');
const bcrypt = require('bcryptjs');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'posmaster-sync-smoke-'));

  initializeDatabase(tempDir);
  const db = getDatabase();
  runMigrations(db);

  const passwordHash = await bcrypt.hash('Pass123!', 10);
  const userId = 'user-sync-smoke';
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, full_name, roles, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(userId, 'syncuser', 'sync@example.com', passwordHash, 'Sync User', JSON.stringify(['admin']), now, now);

  const auth = new AuthService();

  const setDevice = (deviceId, deviceName) => {
    auth.settingsService.getDeviceId = () => deviceId;
    auth.settingsService.getDeviceInfo = () => ({
      device_id: deviceId,
      device_name: deviceName,
      hostname: deviceName,
    });
  };

  setDevice('device-A', 'POS-A');
  const loginA = await auth.login({ email: 'syncuser', password: 'Pass123!' }, { deviceInfo: 'POS-A' });
  if (!loginA.success) throw new Error(`loginA failed: ${loginA.message}`);

  const sessionRepo = new SessionRepository();
  const activeSessionRepo = new ActiveSessionRepository();

  const sessionA = sessionRepo.findByToken(loginA.token);
  const activeA = activeSessionRepo.findByUserId(userId);

  setDevice('device-B', 'POS-B');
  const loginB = await auth.login({ email: 'syncuser', password: 'Pass123!' }, { deviceInfo: 'POS-B' });
  if (!loginB.success) throw new Error(`loginB failed: ${loginB.message}`);

  const localInvalidationWorked = !sessionRepo.findActiveByToken(loginA.token);

  const tokenA2 = 'token-a-simulated';
  const tokenA2Hash = crypto.createHash('sha256').update(tokenA2).digest('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token, device_info, ip_address, is_active, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run('session-a-2', userId, tokenA2, 'POS-A', null, expiry, now, now);

  db.prepare(`
    UPDATE active_sessions
    SET device_id = ?, device_name = ?, session_token_hash = ?, is_active = 1, updated_at = ?
    WHERE user_id = ?
  `).run('device-A', 'POS-A', tokenA2Hash, now, userId);

  db.prepare(`
    INSERT OR REPLACE INTO app_settings (id, setting_key, setting_value, setting_type, description, created_at, updated_at)
    VALUES (?, 'device_id', ?, 'string', 'device id', ?, ?)
  `).run('device-id-setting', 'device-A', now, now);

  sessionValidator.invalidateCache(tokenA2);
  const validateBefore = sessionValidator.validateSessionFast(tokenA2);

  const tokenB2 = 'token-b-simulated';
  const tokenB2Hash = crypto.createHash('sha256').update(tokenB2).digest('hex');
  db.prepare(`
    UPDATE active_sessions
    SET device_id = ?, device_name = ?, session_token_hash = ?, is_active = 1, updated_at = ?
    WHERE user_id = ?
  `).run('device-B', 'POS-B', tokenB2Hash, new Date().toISOString(), userId);

  sessionValidator.invalidateCache(tokenA2);
  const validateAfter = sessionValidator.validateSessionFast(tokenA2);

  const cloudSync = getCloudSyncService();
  const syncQueueRepo = new SyncQueueRepository();
  cloudSync.syncQueueRepo = syncQueueRepo;
  cloudSync.autoSyncEnabled = true;
  cloudSync.isOnline = false;
  cloudSync.mysqlInitialized = false;
  cloudSync.pendingChanges = [];
  cloudSync._pendingChangeKeys.clear();
  cloudSync._pendingChangeRecords.clear();

  await cloudSync.queueChange('items', 'INSERT', { id: 9991, item_name: 'Offline Test Item' }, 9991);
  const queueStats = syncQueueRepo.getStats();
  const queueRecords = syncQueueRepo.findByEntity('items', 9991);

  console.log(JSON.stringify({
    tempDir,
    localInvalidationWorked,
    activeSessionInitialDevice: activeA?.device_id,
    validateBefore,
    validateAfter,
    offlineQueueStats: queueStats,
    offlineQueueRecordCount: queueRecords.length,
    offlineQueueRecordStatus: queueRecords[0]?.status || null,
    pendingChangesInMemory: cloudSync.pendingChanges.length
  }, null, 2));

  closeDatabase();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
