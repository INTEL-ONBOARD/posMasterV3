# POSMaster V3 — Implementation Roadmap

**Status:** Ready for implementation  
**Target Timeline:** 3-4 weeks  
**Effort Estimate:** ~150-180 developer-hours  
**Priority:** CRITICAL — Required before production deployment  

---

## Overview

This document provides a step-by-step implementation guide for fixing all identified issues from the comprehensive audit. Each fix is atomic, testable, and designed to be executed by a junior/lower-tier model with minimal guidance.

### Structure
- **4 implementation phases** (sequential, with Phase 3 parallelizable)
- **52 total findings** across severity levels
- **Before/after code examples** for each fix
- **Testing checkpoints** at each phase boundary

### Execution Model
1. One developer pair-programs with Claude (lower-tier model)
2. Each fix is implemented, tested, and committed separately
3. Phase gate review before proceeding to next phase
4. Deployment only after ALL phases complete

---

# Phase 1: Security Fixes (CRITICAL)

**Timeline:** 1-2 weeks  
**Effort:** 40-50 hours  
**Blocker:** Must complete before any production deployment  
**Testing:** Security-focused test cases, penetration testing readiness  

## 1.1 CORS Wildcard Configuration Fix

**Location:** `config.cjs:25`, `electron.cjs:487`  
**Severity:** CRITICAL  
**Impact:** Allows any website to make authenticated API requests using user's bearer token  

### Current Code
```javascript
// config.cjs:25
ONLINE_API_CORS_ORIGIN: optionalEnv('ONLINE_API_CORS_ORIGIN', '*'),
```

### Problem
- Default wildcard allows any origin
- No validation in electron.cjs:487 when setting CORS headers
- Production build uses same default if env var not set

### Required Changes

**Step 1.1.1: Update config.cjs**
```javascript
// BEFORE
ONLINE_API_CORS_ORIGIN: optionalEnv('ONLINE_API_CORS_ORIGIN', '*'),

// AFTER
ONLINE_API_CORS_ORIGIN: optionalEnv('ONLINE_API_CORS_ORIGIN', 'http://127.0.0.1:3000'),
```

**Step 1.1.2: Add CORS origin validation in electron.cjs**
Find line ~487 where CORS headers are set:
```javascript
// BEFORE
res.header('Access-Control-Allow-Origin', config.cors);

// AFTER
const allowedOrigin = config.cors === '*' ? 'http://127.0.0.1:3000' : config.cors;
if (allowedOrigin !== '*') {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Vary', 'Origin');
}
```

**Step 1.1.3: Update online-runtime-config.json generation**
```javascript
// scripts/write-online-runtime-config.cjs
ONLINE_API_CORS_ORIGIN: optionalEnv('ONLINE_API_CORS_ORIGIN', 'http://127.0.0.1:3000'),
```

**Step 1.1.4: Update .github/workflows/release.yml**
Change line 61 and 107:
```yaml
# BEFORE
ONLINE_API_CORS_ORIGIN: ${{ vars.ONLINE_API_CORS_ORIGIN || '*' }}

# AFTER
ONLINE_API_CORS_ORIGIN: ${{ vars.ONLINE_API_CORS_ORIGIN || 'http://127.0.0.1:3000' }}
```

### Testing
1. **Local dev test:** Start app, verify CORS header is not '*'
2. **Cross-origin test:** Try fetch from different origin (should fail)
3. **Same-origin test:** Verify API calls from 127.0.0.1:3000 still work
4. **Env override test:** Set `ONLINE_API_CORS_ORIGIN=http://custom.local` and verify it's used

### Acceptance Criteria
- [ ] Default CORS origin is 127.0.0.1:3000, not '*'
- [ ] Environment variable can override default
- [ ] CORS header matches configured origin exactly
- [ ] Cross-origin requests are rejected by browser
- [ ] All existing tests pass

---

## 1.2 Organization Scope Bypass Fix

**Location:** `src/backend/services/OnlineModeService.cjs:147, 221, 239, 251`  
**Severity:** CRITICAL  
**Impact:** Multi-tenant data leakage. Queries return wrong organization's data.  

### Problem
```javascript
// BEFORE (line 147, 221, 239, 251)
async getSalesSummary() {
    return await db.collection('sales').find({
        orgId: config.defaultOrgId,  // HARDCODED! Should be user's orgId
    }).toArray();
}
```

This bypasses the authenticated user's organization context and returns data from a default organization that all users see.

### Required Changes

**Step 1.2.1: Trace authentication to get user's orgId**

In `OnlineModeService.cjs`, the service receives requests from `OnlineController.cjs`. Add orgId parameter:

```javascript
// In OnlineController.cjs (line ~150-160), find where handlers call OnlineModeService
// BEFORE
electronAPI.online.getSalesSummary = async () => {
    return onlineModeService.getSalesSummary();
};

// AFTER
electronAPI.online.getSalesSummary = async () => {
    const session = await getSessionFromAuth(); // Get from JWT/session validation
    return onlineModeService.getSalesSummary(session.orgId);
};
```

**Step 1.2.2: Update getSalesSummary (line 147)**
```javascript
// BEFORE
async getSalesSummary() {
    return await db.collection('sales').find({
        orgId: config.defaultOrgId,
    }).toArray();
}

// AFTER
async getSalesSummary(orgId) {
    if (!orgId) throw new Error('orgId required for getSalesSummary');
    return await db.collection('sales').find({
        orgId: orgId,  // Use authenticated user's org
    }).toArray();
}
```

**Step 1.2.3: Update getSalesDaily (line 221)**
```javascript
// BEFORE
async getSalesDaily(date) {
    return await db.collection('sales').find({
        orgId: config.defaultOrgId,
        date: date,
    }).toArray();
}

// AFTER
async getSalesDaily(date, orgId) {
    if (!orgId) throw new Error('orgId required for getSalesDaily');
    return await db.collection('sales').find({
        orgId: orgId,
        date: date,
    }).toArray();
}
```

**Step 1.2.4: Update getActiveSessions (line 239)**
```javascript
// BEFORE
async getActiveSessions() {
    return await db.collection('sessions').find({
        orgId: config.defaultOrgId,
    }).toArray();
}

// AFTER
async getActiveSessions(orgId) {
    if (!orgId) throw new Error('orgId required for getActiveSessions');
    return await db.collection('sessions').find({
        orgId: orgId,
    }).toArray();
}
```

**Step 1.2.5: Update countActiveSessions (line 251)**
```javascript
// BEFORE
async countActiveSessions() {
    return await db.collection('sessions').countDocuments({
        orgId: config.defaultOrgId,
    });
}

// AFTER
async countActiveSessions(orgId) {
    if (!orgId) throw new Error('orgId required for countActiveSessions');
    return await db.collection('sessions').countDocuments({
        orgId: orgId,
    });
}
```

### Testing
1. **Auth validation test:** Call each method without orgId → should throw "orgId required"
2. **Multi-org test:** Create users in Org A and Org B, verify each sees only their data
3. **Org isolation test:** Verify a sale in Org A doesn't appear in Org B's summary
4. **Cross-org attack test:** Try calling with a different user's orgId → should fail auth

### Acceptance Criteria
- [ ] All four methods require orgId parameter
- [ ] Methods throw error if orgId is undefined/null
- [ ] Queries filter by user's authenticated orgId
- [ ] User cannot access other organizations' data
- [ ] Unit tests for each method with multiple orgs

---

## 1.3 Unrestricted IPC Channel Access Fix

**Location:** `preload.cjs:28-29`  
**Severity:** CRITICAL  
**Impact:** Renderer can call ANY IPC handler, bypassing API whitelist  

### Current Code
```javascript
// preload.cjs:28-29
expose: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
},
```

### Problem
- `send()` and `invoke()` accept ANY channel name
- Attacker can call undocumented IPC handlers via XSS
- No validation of which channels are safe to expose

### Required Changes

**Step 1.3.1: Define whitelist of allowed IPC channels**

Create `src/backend/ipc-whitelist.cjs`:
```javascript
// List of IPC channels safe to expose to renderer
const ALLOWED_CHANNELS = {
    // Auth
    'auth:login': true,
    'auth:logout': true,
    'auth:refresh-token': true,
    
    // Online API (safe endpoints only)
    'electronAPI.online.getSalesSummary': true,
    'electronAPI.online.getSalesDaily': true,
    'electronAPI.online.getActiveSessions': true,
    
    // Add more as needed, but be RESTRICTIVE
    // Deny by default, allow by explicit whitelist
};

module.exports = { ALLOWED_CHANNELS };
```

**Step 1.3.2: Update preload.cjs to validate channels**
```javascript
// BEFORE (lines 28-29)
expose: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
},

// AFTER
const { ALLOWED_CHANNELS } = require('./ipc-whitelist.cjs');

expose: {
    send: (channel, ...args) => {
        if (!ALLOWED_CHANNELS[channel]) {
            throw new Error(`IPC channel not allowed: ${channel}`);
        }
        return ipcRenderer.send(channel, ...args);
    },
    invoke: (channel, ...args) => {
        if (!ALLOWED_CHANNELS[channel]) {
            throw new Error(`IPC channel not allowed: ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
    },
},
```

**Step 1.3.3: Test blocked channels**
```javascript
// In tests, verify these throw errors:
try {
    await electronAPI.invoke('backend:internal-secret');
} catch (e) {
    console.log('✓ Correctly blocked:', e.message);
}
```

### Testing
1. **Whitelist enforcement test:** Try calling undefined channel → should throw "not allowed"
2. **Allowed channel test:** Call whitelisted channel → should work
3. **Renderer isolation test:** Verify XSS payload can't access non-whitelisted IPC
4. **Integration test:** All existing features still work through whitelisted channels

### Acceptance Criteria
- [ ] ALLOWED_CHANNELS whitelist exists and is explicit
- [ ] preload.cjs validates all channel access
- [ ] Attempts to call non-whitelisted channels throw errors
- [ ] All existing features use only whitelisted channels
- [ ] Add comments explaining why each channel is allowed

---

## 1.4 Session Enumeration Fix

**Location:** `src/backend/controllers/OnlineController.cjs` (handler registration)  
**Severity:** CRITICAL  
**Impact:** Attacker can enumerate valid sessions, users, and organizations  

### Problem
Methods like `getActiveSessions()` return full lists without pagination, allowing an attacker to:
1. Enumerate all active sessions
2. Learn user/organization structure
3. Find targets for further attacks

### Required Changes

**Step 1.4.1: Add pagination to session queries**

In `OnlineModeService.cjs`, update `getActiveSessions`:
```javascript
// BEFORE
async getActiveSessions(orgId) {
    return await db.collection('sessions').find({
        orgId: orgId,
    }).toArray();  // Returns ALL sessions
}

// AFTER
async getActiveSessions(orgId, limit = 100, skip = 0) {
    if (!orgId) throw new Error('orgId required');
    if (limit > 1000) limit = 1000;  // Cap results
    
    return await db.collection('sessions')
        .find({ orgId: orgId })
        .limit(limit)
        .skip(skip)
        .toArray();
}
```

**Step 1.4.2: Add rate limiting to enumeration endpoints**

Install `express-rate-limit`:
```bash
npm install express-rate-limit
```

In `electron.cjs` where handlers are registered:
```javascript
const rateLimit = require('express-rate-limit');

const enumLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,              // 10 requests per minute max
    message: 'Too many enumeration requests',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply to sensitive endpoints
app.get('/api/sessions', enumLimiter, (req, res) => {
    // Handler code
});

app.get('/api/users/search', enumLimiter, (req, res) => {
    // Handler code
});
```

**Step 1.4.3: Remove user enumeration from legacy shims**

In `OnlineController.cjs` line ~150-280, find handlers like:
```javascript
// BEFORE - returns ALL users
electronAPI.users.search = async (query) => {
    const db = getDb();
    return await db.collection('users').find({}).toArray();
};

// AFTER - restricted, paginated search
electronAPI.users.search = async (query, options = {}) => {
    const { limit = 50, skip = 0 } = options;
    if (limit > 500) limit = 500;
    
    const db = getDb();
    return await db.collection('users')
        .find({ name: { $regex: query, $options: 'i' } })
        .limit(limit)
        .skip(skip)
        .toArray();
};
```

### Testing
1. **Pagination test:** Request sessions with limit=50 → should return max 50 records
2. **Rate limit test:** Send 15 enumeration requests in 1 second → 11th+ should be rate-limited
3. **Query filtering test:** Search users with empty query → should require non-empty query
4. **Authenticated access test:** Verify only authenticated users can enumerate

### Acceptance Criteria
- [ ] Enumeration endpoints return paginated results (max ~100 per request)
- [ ] Rate limiter active on sensitive endpoints
- [ ] Searches require non-empty query string
- [ ] No endpoint returns complete data set in one call

---

## 1.5 JWT Secret & Token Storage Fix

**Location:** `config.cjs:22`, `src/backend/auth/jwt.cjs`, `electron.cjs`  
**Severity:** CRITICAL  
**Impact:** Token compromise allows unlimited session hijacking  

### Current Problems
1. Default JWT_SECRET is weak or missing
2. Bearer token stored in browser memory (vulnerable to XSS)
3. No token expiration validation
4. No refresh token rotation

### Required Changes

**Step 1.5.1: Enforce strong JWT secret**

In `config.cjs`:
```javascript
// BEFORE
JWT_SECRET: requiredEnv('JWT_SECRET'),  // May be weak if manually set

// AFTER
JWT_SECRET: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            'JWT_SECRET must be set and at least 32 characters. ' +
            'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }
    return secret;
})(),
```

**Step 1.5.2: Store token securely in Electron**

In `electron.cjs`, update token handling:
```javascript
// BEFORE - token in plain memory
let authToken = null;
electronAPI.auth.login = async (credentials) => {
    const response = await fetch('/api/auth/login', { body: JSON.stringify(credentials) });
    const { token } = await response.json();
    authToken = token;  // VULNERABLE: XSS can read memory
};

// AFTER - token in httpOnly cookie (if possible) or secure storage
electronAPI.auth.login = async (credentials) => {
    const response = await fetch('/api/auth/login', { 
        body: JSON.stringify(credentials),
        credentials: 'include'  // Include cookies
    });
    // Token is now stored in httpOnly cookie, inaccessible to JavaScript
};
```

**Step 1.5.3: Add token expiration validation**

In `src/backend/auth/jwt.cjs`:
```javascript
// BEFORE
const decoded = jwt.verify(token, config.JWT_SECRET);

// AFTER
const decoded = jwt.verify(token, config.JWT_SECRET);
if (decoded.exp && Date.now() >= decoded.exp * 1000) {
    throw new Error('Token expired');
}
```

**Step 1.5.4: Implement refresh token rotation**

In auth controller, add refresh endpoint:
```javascript
electronAPI.auth.refreshToken = async () => {
    const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
    });
    if (!response.ok) throw new Error('Token refresh failed');
    return await response.json();
};
```

### Testing
1. **Weak secret test:** Try starting with JWT_SECRET='abc' → should throw error
2. **Strong secret test:** Start with 32+ char secret → should start normally
3. **XSS protection test:** Token should not be readable via JavaScript in Electron
4. **Expiration test:** Create token with 1-second expiration, wait, verify it's invalid
5. **Refresh test:** Call refreshToken endpoint → should return new valid token

### Acceptance Criteria
- [ ] JWT_SECRET enforced to be 32+ characters
- [ ] Token generation includes exp claim
- [ ] Tokens expire automatically (TTL < 8 hours)
- [ ] Refresh token mechanism implemented
- [ ] Tokens not stored in plain JavaScript variable
- [ ] Setup docs explain how to generate JWT_SECRET

---

## 1.6 Rate Limiting & Brute Force Protection

**Location:** `electron.cjs`, login handlers  
**Severity:** CRITICAL  
**Impact:** Attackers can brute-force credentials without limit  

### Required Changes

**Step 1.6.1: Add login rate limiting**

In `electron.cjs` or auth middleware:
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                     // 5 attempts per 15 minutes
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    store: new store.MemoryStore(),
    keyGenerator: (req, res) => {
        // Rate limit by username, not just IP
        return req.body?.username || req.ip;
    },
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

**Step 1.6.2: Add account lockout after N failed attempts**

```javascript
// In user document, track failed attempts
async function recordFailedLogin(username) {
    const user = await db.collection('users').findOne({ username });
    if (!user) return;
    
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    if (failedAttempts >= 5) {
        await db.collection('users').updateOne(
            { username },
            { 
                $set: { 
                    locked: true, 
                    lockedUntil: Date.now() + (30 * 60 * 1000) // 30 min lockout
                }
            }
        );
    }
}

async function clearFailedLogins(username) {
    await db.collection('users').updateOne(
        { username },
        { $set: { failedLoginAttempts: 0 } }
    );
}
```

### Testing
1. **Rate limit test:** Send 6 login requests in 15 minutes → 6th should be rejected
2. **Account lockout test:** 5 failed attempts → account locked for 30 minutes
3. **Lockout bypass prevention:** Verify locked account can't login even with correct password
4. **Lockout expiry:** Wait 30 minutes, verify account unlocks automatically

### Acceptance Criteria
- [ ] Login endpoint rate-limited to 5 attempts per 15 minutes
- [ ] Account locked after 5 failed attempts
- [ ] Lockout lasts 30 minutes or until admin unlock
- [ ] Lockout applies to the account, not the IP
- [ ] Logs record all failed login attempts

---

# Phase 2: Architecture & Operations Fixes

**Timeline:** 2-3 weeks  
**Effort:** 50-60 hours  
**Dependencies:** Phase 1 must be complete  
**Testing:** Integration tests, deployment scenario validation  

## 2.1 Silent Bundled Server Startup Failure Fix

**Location:** `electron.cjs:1397-1404`, `src/online-server/runtime.cjs:16`  
**Severity:** CRITICAL  
**Impact:** Startup errors silently ignored, users see generic "check connection" message  

### Current Code
```javascript
// electron.cjs:1397-1404
try {
    await startOnlineServer();
} catch (error) {
    console.error('Failed to start online server:', error);  // Invisible on Windows
    // Error is swallowed, server never starts
}
```

### Problem
1. Console.error() doesn't exist on Windows packaged app
2. No error propagation to UI
3. User has no idea why app is broken
4. Support costs increase due to opacity

### Required Changes

**Step 2.1.1: Capture and store startup errors**

In `electron.cjs`, near startup code:
```javascript
// Create error log file for bundled server failures
const ERROR_LOG_PATH = path.join(app.getPath('userData'), 'server-startup-errors.log');

async function startOnlineServerWithErrorTracking() {
    try {
        const runtime = await startOnlineServer();
        // Clear previous errors on success
        if (fs.existsSync(ERROR_LOG_PATH)) {
            fs.unlinkSync(ERROR_LOG_PATH);
        }
        return runtime;
    } catch (error) {
        // Log to file
        const timestamp = new Date().toISOString();
        const errorMessage = `[${timestamp}] ${error.message}\n${error.stack}\n\n`;
        fs.appendFileSync(ERROR_LOG_PATH, errorMessage);
        
        // Also log to console for dev builds
        if (!app.isPackaged) {
            console.error('Server startup failed:', error);
        }
        
        throw error;
    }
}
```

**Step 2.1.2: Add startup error UI display**

In `src/frontend/pages/Intro.jsx` (the splash screen):
```javascript
// BEFORE
const [status, setStatus] = useState('Checking connection...');

// AFTER
const [status, setStatus] = useState('Checking connection...');
const [errorDetails, setErrorDetails] = useState(null);

useEffect(() => {
    async function checkStartupErrors() {
        try {
            const errors = await electronAPI.readStartupErrors?.();
            if (errors) {
                setErrorDetails(errors);
            }
        } catch (e) {
            console.error('Could not read startup errors:', e);
        }
    }
    checkStartupErrors();
}, []);

// In JSX, show detailed error if available:
{errorDetails && (
    <div className="error-details">
        <h3>Server Startup Failed</h3>
        <details>
            <summary>Error Details (for support)</summary>
            <pre>{errorDetails}</pre>
        </details>
        <p>Please restart the application or contact support.</p>
    </div>
)}
```

**Step 2.1.3: Add startup error endpoint**

In preload.cjs, expose error reader:
```javascript
readStartupErrors: async () => {
    const logPath = path.join(app.getPath('userData'), 'server-startup-errors.log');
    if (fs.existsSync(logPath)) {
        return fs.readFileSync(logPath, 'utf8').slice(-2000); // Last 2000 chars
    }
    return null;
},
```

**Step 2.1.4: Fix MongoDB connection error handling**

In `src/online-server/runtime.cjs:16`:
```javascript
// BEFORE
try {
    await connectMongo();  // Fails silently if Mongo is down
    const app = createApp();
    server = http.createServer(app);
    // ...
}

// AFTER
try {
    await connectMongo().catch(error => {
        throw new Error(`MongoDB connection failed: ${error.message}. Check MONGODB_URI and IP allowlist.`);
    });
    
    const app = createApp();
    server = http.createServer(app);
    // ...
} catch (error) {
    throw error;  // Re-throw with context
}
```

**Step 2.1.5: Add startup diagnostics endpoint**

Add a diagnostics handler in Express:
```javascript
app.get('/api/diagnostic', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        mongoConnected: !!getOnlineServerRuntime(),
        mongoDatabase: config.mongoDbName,
        serverVersion: require('../package.json').version,
        uptime: process.uptime(),
    });
});
```

### Testing
1. **Normal startup test:** Start with MongoDB available → no error log created
2. **MongoDB down test:** Stop MongoDB, start app → error log contains "MongoDB connection failed"
3. **Error display test:** Kill MongoDB, start app, verify UI shows "Server Startup Failed" with details
4. **Error persistence test:** Error log persists after restart and shows on next startup
5. **Error clearing test:** Restart with MongoDB available → error log is cleared

### Acceptance Criteria
- [ ] Server startup errors logged to file (not lost)
- [ ] Error log readable on Windows (no console.error dependency)
- [ ] UI displays specific error message (not generic "check connection")
- [ ] Error log includes timestamp, error message, and stack trace
- [ ] /api/diagnostic endpoint returns server health status
- [ ] Support can ask user for server-startup-errors.log file

---

## 2.2 Single Instance Lock Fix

**Location:** `electron.cjs` (main process startup)  
**Severity:** CRITICAL  
**Impact:** Multiple app instances can run, causing data corruption and race conditions  

### Current Code
```javascript
// Missing entirely!
// No app.requestSingleInstanceLock() call
```

### Problem
- User can run `npm run dev:all` multiple times
- Multiple Electron instances share same MongoDB
- Race conditions on sales, inventory updates
- Session table corrupted by concurrent writes

### Required Changes

**Step 2.2.1: Add single instance lock**

In `electron.cjs`, at the very start of the app startup:
```javascript
// Near the top of the file, before any other code
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Another instance is already running
    console.warn('[Electron] Another instance is running, exiting');
    app.quit();
    process.exit(0);
} else {
    // This is the first instance
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // User tried to run the app again
        // Bring the existing window to front
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}
```

**Step 2.2.2: Test lock enforcement**

```bash
# Terminal 1
npm run dev:all

# Terminal 2 (immediately)
npm run dev:all
# Should see: [Electron] Another instance is running, exiting
```

### Testing
1. **First instance test:** `npm run dev:all` → app starts, server runs
2. **Second instance test:** Run `npm run dev:all` again → exits immediately
3. **Window focus test:** Second attempt should bring main window to focus
4. **CLI flag test:** Verify packaged app also enforces lock

### Acceptance Criteria
- [ ] First instance starts normally
- [ ] Second instance exits immediately with message
- [ ] Attempting to start second instance brings main window to focus
- [ ] Lock applies to both dev and packaged builds
- [ ] No race condition issues on concurrent MongoDB writes

---

## 2.3 Config Fallback Chain Fix

**Location:** `config.cjs:15-42`  
**Severity:** HIGH  
**Impact:** Confusing default behavior, security risks from accidental fallbacks  

### Current Code
```javascript
// config.cjs
MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
CORS: process.env.CORS || '*',
JWT_SECRET: process.env.JWT_SECRET || 'weak-secret-key',
```

### Problem
1. Fallback to localhost Mongo silently connects to dev DB in production
2. CORS wildcard is default
3. Weak JWT secret is default
4. No warning when using fallbacks

### Required Changes

**Step 2.3.1: Separate required vs. optional config**

```javascript
// config.cjs - BEFORE
const config = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
    // ...
};

// config.cjs - AFTER
const requiredInProduction = [
    'MONGODB_URI',
    'JWT_SECRET',
    'ONLINE_API_CORS_ORIGIN',
];

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Missing required configuration: ${name}\n` +
            `Set environment variable: export ${name}="value"`
        );
    }
    return value;
}

function optionalEnv(name, fallback) {
    const value = process.env[name];
    if (!value && !app.isPackaged) {
        console.warn(`[Config] Using default for ${name}: "${fallback}"`);
    }
    return value || fallback;
}

const config = {
    // Production-critical (must be set)
    MONGODB_URI: app.isPackaged ? requiredEnv('MONGODB_URI') : optionalEnv('MONGODB_URI', 'mongodb://127.0.0.1:27017'),
    JWT_SECRET: app.isPackaged ? requiredEnv('JWT_SECRET') : optionalEnv('JWT_SECRET', 'dev-secret-not-for-production'),
    
    // Should be set in production, but has sensible dev default
    ONLINE_API_CORS_ORIGIN: optionalEnv('ONLINE_API_CORS_ORIGIN', 'http://127.0.0.1:3000'),
    
    // Optional with hardcoded defaults
    PORT: parseInt(optionalEnv('PORT', '4100')),
};
```

**Step 2.3.2: Add startup validation**

```javascript
// After config object is created
if (app.isPackaged) {
    const errors = [];
    if (!process.env.MONGODB_URI) errors.push('MONGODB_URI');
    if (!process.env.JWT_SECRET) errors.push('JWT_SECRET');
    
    if (errors.length > 0) {
        console.error(
            '[Config] Missing required production environment variables:\n' +
            errors.map(e => `  - ${e}`).join('\n')
        );
        process.exit(1);
    }
}
```

**Step 2.3.3: Log actual config on startup (sanitized)**

```javascript
console.log('[Config] Loaded configuration:');
console.log(`  MONGODB_URI: ${config.MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):[^@]+@/, 'mongodb://***:***@')}`);
console.log(`  PORT: ${config.PORT}`);
console.log(`  CORS: ${config.ONLINE_API_CORS_ORIGIN}`);
console.log(`  JWT_SECRET: ${config.JWT_SECRET?.substring(0, 8)}...${config.JWT_SECRET?.length > 8 ? 'SET' : 'MISSING'}`);
```

### Testing
1. **Dev mode test:** Unset env vars, start with `npm run dev:all` → should log "Using default" messages
2. **Prod mode test:** Set NODE_ENV=production, unset critical vars → should exit with error
3. **Prod mode test:** Set all required vars → should start and log config
4. **Sanitization test:** Logs should not reveal passwords or secrets

### Acceptance Criteria
- [ ] Required vars throw errors in packaged app if unset
- [ ] Optional vars use sensible dev defaults in dev mode
- [ ] Startup logs show which config values are being used
- [ ] Secrets are never logged in full
- [ ] Clear error messages guide user to set env vars

---

## 2.4 Dual-Runtime Topology Documentation & Fixes

**Location:** `electron.cjs:1255-1366`, `package.json` scripts  
**Severity:** HIGH  
**Impact:** Dev/packaged runtime differences cause bugs and deployment surprises  

### Current Issues
1. Dev runtime: 3 separate processes (Vite, Node, Electron)
2. Packaged runtime: Bundled single process
3. No documentation of differences
4. Window creation in main startup code (not centralized)

### Required Changes

**Step 2.4.1: Create runtime documentation**

Create `docs/RUNTIME.md`:
```markdown
# Runtime Topology

## Development Mode (`npm run dev:all`)

Three separate Node.js processes:
1. **Vite Dev Server** (port 5173) - Serves React UI with HMR
2. **Express Online Server** (port 4100) - Backend API
3. **Electron Main Process** - Bridges Vite + Express

Data flow:
```
React UI (Vite:5173) 
  → IPC Bridge → Electron Main 
  → OnlineApiClient → Express (localhost:4100) 
  → MongoDB
```

## Packaged Mode (Production Build)

Single Electron process with embedded Express:
1. **Electron Main Process** - Runs Vite-bundled React + embedded Express server
2. Express server bundled and started in runtime.cjs

Data flow:
```
React UI (in Electron window)
  → IPC Bridge → Electron Main
  → Embedded Express (localhost:4100)
  → MongoDB
```

## Key Differences

| Aspect | Dev | Packaged |
|--------|-----|----------|
| Processes | 3 | 1 |
| HMR | ✓ Enabled | ✗ Disabled |
| Source Maps | ✓ Available | ✗ Minified |
| Console Output | ✓ Visible in terminal | ✗ Only in logs |
| Error Handling | ✓ Stack traces | ✗ Generic messages |
| Config Validation | ✓ Warns on missing vars | ✗ Throws on missing vars |

## Testing Both Runtimes

Always test both before committing:
```bash
npm run dev:all          # Test dev mode
npm run dist             # Build packaged
npm run dist:run         # Test packaged
```
```

**Step 2.4.2: Centralize window creation**

In `electron.cjs`, extract window creation to a function:
```javascript
// BEFORE: Lines 1255-1366 create window inline in startup

// AFTER: Create function
function createMainWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            // ... other settings
        },
    });

    if (app.isPackaged) {
        // Production: load packaged React
        mainWindow.loadFile('dist/index.html');
    } else {
        // Development: load from Vite dev server
        mainWindow.loadURL('http://127.0.0.1:5173');
        mainWindow.webDevTools.openDevTools(); // Auto-open DevTools
    }

    return mainWindow;
}

// Then in app startup:
app.whenReady().then(() => {
    const mainWindow = createMainWindow();
    // ...
});
```

**Step 2.4.3: Add runtime detection helper**

```javascript
// src/backend/runtime.cjs
function getRuntime() {
    return {
        isDev: !app.isPackaged,
        isProd: app.isPackaged,
        mode: app.isPackaged ? 'production' : 'development',
        expressUrl: `http://127.0.0.1:${config.PORT}`,
    };
}

module.exports = { getRuntime };
```

### Testing
1. **Dev mode test:** `npm run dev:all` → 3 processes visible in Task Manager/Activity Monitor
2. **Packaged mode test:** `npm run dist:run` → 1 process visible
3. **Dev mode error test:** Kill Express, observe error in Electron window
4. **Packaged mode error test:** Run without MongoDB → observe error handling differs

### Acceptance Criteria
- [ ] docs/RUNTIME.md documents both topologies
- [ ] Window creation centralized in single function
- [ ] Runtime detection helper available throughout codebase
- [ ] Comments explain dev vs. packaged differences
- [ ] CI/CD tests both runtimes

---

## 2.5 Auto-Updater Implementation

**Location:** `electron.cjs`, new `src/updater.cjs`  
**Severity:** HIGH  
**Impact:** No way to push critical security updates to users  

### Current Situation
- No auto-updater configured
- Users manually download new versions
- Critical security patches take weeks to deploy

### Required Changes

**Step 2.5.1: Configure electron-updater**

Install: `npm install electron-updater`

Create `src/updater.cjs`:
```javascript
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    // Could notify user here
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('Update ready to install:', info.version);
    autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (err) => {
    console.error('Update error:', err);
});

module.exports = { autoUpdater };
```

**Step 2.5.2: Configure release.yml for auto-updates**

In `.github/workflows/release.yml`, the build already publishes releases. Configure updater to check GitHub:

```javascript
// In electron.cjs, after app init
if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
    // Check every 24 hours
    setInterval(() => autoUpdater.checkForUpdates(), 24 * 60 * 60 * 1000);
}
```

### Testing
1. **Update availability test:** Create a test release with higher version
2. **Update download test:** Verify update is downloaded to cache
3. **Update install test:** Restart app → new version should launch
4. **Rollback test:** If update fails, original version should still work

### Acceptance Criteria
- [ ] Auto-updater configured to check GitHub releases
- [ ] Users prompted when update available
- [ ] Update downloads in background
- [ ] Restart installs update
- [ ] Rollback available if update fails

---

# Phase 3: Observability & Monitoring (Can run parallel with Phase 2)

**Timeline:** 1-2 weeks  
**Effort:** 30-40 hours  
**Dependencies:** Phase 1 security fixes  
**Testing:** Log capture tests, monitoring dashboard verification  

## 3.1 Structured Logging Implementation

**Location:** New `src/backend/logger.cjs`, all service files  
**Severity:** HIGH  
**Impact:** Cannot debug production issues without logs  

### Required Changes

**Step 3.1.1: Create logger utility**

Create `src/backend/logger.cjs`:
```javascript
const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

class Logger {
    constructor(service) {
        this.service = service;
        this.logDir = path.join(app.getPath('userData'), 'logs');
        fs.mkdirSync(this.logDir, { recursive: true });
    }

    log(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = JSON.stringify({
            timestamp,
            level,
            service: this.service,
            message,
            ...data,
        });

        // File
        fs.appendFileSync(
            path.join(this.logDir, `${this.service}.log`),
            logEntry + '\n'
        );

        // Dev mode console
        if (!app.isPackaged) {
            console[level.toLowerCase()] ? 
                console[level.toLowerCase()](`[${this.service}] ${message}`, data) :
                console.log(`[${this.service}] ${message}`, data);
        }
    }

    debug(message, data) { this.log('DEBUG', message, data); }
    info(message, data) { this.log('INFO', message, data); }
    warn(message, data) { this.log('WARN', message, data); }
    error(message, data) { this.log('ERROR', message, data); }
}

module.exports = Logger;
```

**Step 3.1.2: Wire logger into services**

In `src/backend/services/OnlineModeService.cjs`:
```javascript
// BEFORE
async getSalesSummary(orgId) {
    return await db.collection('sales').find({ orgId }).toArray();
}

// AFTER
const Logger = require('../logger.cjs');
const logger = new Logger('OnlineModeService');

async getSalesSummary(orgId) {
    logger.debug('getSalesSummary called', { orgId });
    try {
        const result = await db.collection('sales').find({ orgId }).toArray();
        logger.info('getSalesSummary completed', { orgId, count: result.length });
        return result;
    } catch (error) {
        logger.error('getSalesSummary failed', { orgId, error: error.message });
        throw error;
    }
}
```

**Step 3.1.3: Log startup sequence**

In `electron.cjs` startup:
```javascript
const logger = new Logger('Electron');

logger.info('App starting', { version: app.getVersion() });
logger.info('Config loaded', { 
    mongoUri: config.MONGODB_URI.substring(0, 30) + '...',
    port: config.PORT,
});

try {
    const runtime = await startOnlineServerWithErrorTracking();
    logger.info('Online server started', { port: config.PORT });
} catch (error) {
    logger.error('Server startup failed', { error: error.message });
    throw error;
}
```

### Testing
1. **Log creation test:** Start app → `logs/` directory created with log files
2. **Log content test:** Verify logs contain structured JSON entries with timestamps
3. **Error logging test:** Cause an error → verify it's logged with stack trace
4. **Log rotation test:** After logs exceed 10MB → should rotate to backup file
5. **Dev mode test:** Logs appear in console output in dev mode

### Acceptance Criteria
- [ ] Logger utility created and exported
- [ ] All services use logger for errors and important operations
- [ ] Logs are structured JSON (machine-readable)
- [ ] Logs include timestamp, service name, and relevant context
- [ ] Dev mode logs to console, packaged app logs to file
- [ ] Log files rotated when >10MB

---

## 3.2 Error Tracking Integration

**Location:** New `src/backend/error-tracker.cjs`, all error handling  
**Severity:** HIGH  
**Impact:** Unhandled exceptions disappear; no visibility into production issues  

### Required Changes

**Step 3.2.1: Setup Sentry (or similar)**

Using Sentry as example (free tier available):
```bash
npm install @sentry/electron @sentry/tracing
```

Create `src/backend/error-tracker.cjs`:
```javascript
const Sentry = require('@sentry/electron');

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    beforeSend(event, hint) {
        // Don't send logs for non-errors in dev
        if (!process.env.SENTRY_DSN) return null;
        return event;
    },
});

module.exports = Sentry;
```

**Step 3.2.2: Catch unhandled exceptions**

In `electron.cjs`:
```javascript
const Sentry = require('./error-tracker.cjs');

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    Sentry.captureException(error);
});

// Also for promises
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    Sentry.captureException(new Error(reason));
});
```

**Step 3.2.3: Wire into Express error handling**

```javascript
// In electron.cjs Express middleware setup
app.use((err, req, res, next) => {
    logger.error('Express error', {
        message: err.message,
        status: err.status || 500,
        path: req.path,
    });
    Sentry.captureException(err);
    res.status(err.status || 500).json({ error: err.message });
});
```

### Testing
1. **Manual error test:** Throw an error in a handler → should be logged and sent to Sentry
2. **Unhandled rejection test:** Trigger unhandled promise rejection → should be caught
3. **Express error test:** Send request that causes 500 error → should be tracked
4. **No-DSN dev mode test:** Start without SENTRY_DSN → errors logged locally only

### Acceptance Criteria
- [ ] Sentry account setup and DSN configured
- [ ] SENTRY_DSN environment variable added to build config
- [ ] Uncaught exceptions logged to Sentry
- [ ] Express errors logged and tracked
- [ ] Dashboard shows error trends over time

---

## 3.3 Health Check Endpoint

**Location:** `electron.cjs` Express server, `src/frontend/pages/Intro.jsx`  
**Severity:** MEDIUM  
**Impact:** Cannot determine if server is ready before loading UI  

### Required Changes

**Step 3.3.1: Add comprehensive health check**

In `electron.cjs` Express setup:
```javascript
app.get('/health', async (req, res) => {
    const checks = {
        timestamp: new Date().toISOString(),
        status: 'ok',
        mongodb: false,
        server: true,
        errors: [],
    };

    // Check MongoDB
    try {
        await db.admin().ping();
        checks.mongodb = true;
    } catch (error) {
        checks.mongodb = false;
        checks.errors.push(`MongoDB unavailable: ${error.message}`);
        checks.status = 'unhealthy';
    }

    // Check config
    if (!config.MONGODB_URI) {
        checks.errors.push('MONGODB_URI not configured');
        checks.status = 'unhealthy';
    }

    const statusCode = checks.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(checks);
});
```

**Step 3.3.2: Update Intro.jsx to use health check**

```javascript
// In src/frontend/pages/Intro.jsx
const [status, setStatus] = useState('Checking server health...');
const [serverReady, setServerReady] = useState(false);

useEffect(() => {
    async function checkHealth() {
        for (let attempt = 0; attempt < 45; attempt++) {
            try {
                const response = await fetch('/health');
                const data = await response.json();

                if (data.status === 'ok') {
                    setServerReady(true);
                    setStatus('Ready');
                    return;
                } else {
                    setStatus(`Server initializing: ${data.errors[0]}`);
                }
            } catch (error) {
                setStatus(`Connection failed: ${error.message}`);
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        setStatus('Server failed to start. Check logs for details.');
    }

    checkHealth();
}, []);
```

### Testing
1. **Healthy startup test:** Start app → `/health` returns status 200 + mongodb: true
2. **MongoDB down test:** Stop MongoDB → `/health` returns status 503 + errors array
3. **Timeout test:** Don't fix MongoDB, wait 45s → UI shows "Server failed to start"
4. **Recovery test:** Start MongoDB within timeout → app continues and becomes ready

### Acceptance Criteria
- [ ] /health endpoint returns current status
- [ ] Endpoint includes mongodb connectivity check
- [ ] Returns 200 if healthy, 503 if unhealthy
- [ ] Intro.jsx polls /health and updates status message
- [ ] User sees specific error (not generic "check connection")

---

## 3.4 Printer Autodiscovery Optimization

**Location:** `src/frontend/pages/sales/SalesView.jsx` or printer service  
**Severity:** MEDIUM  
**Impact:** Subnet scanning freezes UI for 30 seconds on start  

### Current Issue
App scans entire subnet (192.168.1.0/24 = 256 IPs) looking for printers on port 9100. This blocks the UI thread.

### Required Changes

**Step 3.4.1: Move scan to background thread**

Create `src/backend/printer-discovery.cjs`:
```javascript
const { Worker } = require('worker_threads');
const path = require('path');

async function discoverPrintersAsync() {
    return new Promise((resolve) => {
        const worker = new Worker(path.join(__dirname, 'printer-discovery-worker.cjs'));
        
        worker.on('message', (printers) => {
            resolve(printers);
            worker.terminate();
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            resolve([]);
            worker.terminate();
        }, 10000);
    });
}

module.exports = { discoverPrintersAsync };
```

**Step 3.4.2: Cache discovered printers**

```javascript
// Cache for 1 hour or manual refresh
const printerCache = {
    data: [],
    timestamp: 0,
};

async function getPrinters(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && (now - printerCache.timestamp) < 60 * 60 * 1000) {
        return printerCache.data;
    }

    const printers = await discoverPrintersAsync();
    printerCache.data = printers;
    printerCache.timestamp = now;
    return printers;
}
```

**Step 3.4.3: Add refresh button to UI**

In `SalesView.jsx`:
```javascript
const [printers, setPrinters] = useState([]);
const [scanningPrinters, setScanningPrinters] = useState(false);

async function refreshPrinters() {
    setScanningPrinters(true);
    const discovered = await electronAPI.getPrinters(true); // Force refresh
    setPrinters(discovered);
    setScanningPrinters(false);
}

return (
    <button onClick={refreshPrinters} disabled={scanningPrinters}>
        {scanningPrinters ? 'Scanning...' : 'Refresh Printers'}
    </button>
);
```

### Testing
1. **Non-blocking startup test:** App starts and loads UI immediately (don't wait for printer scan)
2. **Cache test:** Restart app within 1 hour → printers load from cache instantly
3. **Refresh test:** Click refresh → scans in background, UI remains responsive
4. **Timeout test:** If scan hangs → auto-return empty list after 10 seconds

### Acceptance Criteria
- [ ] Printer discovery doesn't block UI startup
- [ ] Discovered printers cached for 1 hour
- [ ] Manual refresh button available
- [ ] Scan completes or times out within 10 seconds
- [ ] UI remains responsive during scan

---

# Phase 4: Code Quality & Maintainability

**Timeline:** 2-3 weeks  
**Effort:** 40-50 hours  
**Dependencies:** Phases 1-3 complete  
**Testing:** Code review, unit tests for refactored components  

## 4.1 Silent Wrong Answers Fix (Legacy Shims)

**Location:** `src/backend/controllers/OnlineController.cjs:147-281`  
**Severity:** MEDIUM  
**Impact:** Search handlers accept filters but ignore them, returning full lists  

### Current Code
```javascript
// BEFORE - 135 lines of shims that silently ignore arguments
electronAPI.categories.search = async (query) => {
    // Query parameter ignored! Returns all categories.
    return await db.collection('categories').find({}).toArray();
};

electronAPI.users.search = async (query) => {
    // Query parameter ignored! Returns all users (privacy leak).
    return await db.collection('users').find({}).toArray();
};
```

### Problem
1. Frontend passes filter, backend ignores it
2. UI shows full list but user expects filtered results
3. Privacy issue: enumerate all users
4. Performance issue: full collection scan for every query

### Required Changes

**Step 4.1.1: Implement proper search handlers**

```javascript
// BEFORE (lines 147-281)
// 135 lines of broken shims

// AFTER - Proper implementations
electronAPI.categories.search = async (query) => {
    if (!query || typeof query !== 'string') {
        throw new Error('Query required for category search');
    }
    return await db.collection('categories')
        .find({ name: { $regex: query, $options: 'i' } })
        .limit(50)
        .toArray();
};

electronAPI.users.search = async (query, orgId) => {
    if (!query || typeof query !== 'string') {
        throw new Error('Query required for user search');
    }
    if (!orgId) {
        throw new Error('orgId required for user search');
    }
    return await db.collection('users')
        .find({
            orgId: orgId,
            name: { $regex: query, $options: 'i' }
        })
        .limit(50)
        .toArray();
};

electronAPI.products.search = async (query, orgId) => {
    if (!query || typeof query !== 'string') {
        throw new Error('Query required for product search');
    }
    if (!orgId) {
        throw new Error('orgId required for product search');
    }
    return await db.collection('products')
        .find({
            orgId: orgId,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { sku: { $regex: query, $options: 'i' } }
            ]
        })
        .limit(50)
        .toArray();
};
```

**Step 4.1.2: Add test coverage**

```javascript
// test/controllers/search.test.js
describe('Search handlers', () => {
    it('categories.search filters by query', async () => {
        await db.collection('categories').insertMany([
            { name: 'Electronics' },
            { name: 'Produce' },
            { name: 'Dairy' },
        ]);

        const results = await electronAPI.categories.search('elec');
        expect(results.length).toBe(1);
        expect(results[0].name).toBe('Electronics');
    });

    it('users.search requires query', async () => {
        await expect(electronAPI.users.search('')).rejects.toThrow('Query required');
    });

    it('users.search requires orgId', async () => {
        await expect(electronAPI.users.search('john')).rejects.toThrow('orgId required');
    });

    it('products.search searches both name and sku', async () => {
        await db.collection('products').insertMany([
            { name: 'Widget', sku: 'WDG-001' },
            { name: 'Gadget', sku: 'GAD-001' },
        ]);

        const byName = await electronAPI.products.search('widget', 'org1');
        const bySku = await electronAPI.products.search('GAD', 'org1');

        expect(byName.length).toBe(1);
        expect(bySku.length).toBe(1);
    });
});
```

### Testing
1. **Filter test:** Search for specific query → returns only matching results
2. **Case-insensitive test:** Search "ELEC" → finds "Electronics"
3. **Limit test:** Search that would match 1000 items → return max 50
4. **Error test:** Search without query → throws "Query required"
5. **Privacy test:** User from Org A can only find users in Org A

### Acceptance Criteria
- [ ] All search handlers properly filter by query
- [ ] Searches are case-insensitive
- [ ] Results limited to max 50 per search
- [ ] Query parameter required (no empty searches)
- [ ] Organization-scoped searches enforce orgId
- [ ] Unit tests written for each handler
- [ ] 135 lines of broken shims deleted

---

## 4.2 Dead Code Removal

**Location:** `src/backend/utils/eventBroadcaster.cjs` (and others)  
**Severity:** LOW  
**Impact:** Confusion, maintenance burden, larger bundle  

### Current Issues
- `eventBroadcaster.cjs` (270 lines) not required anywhere
- Unused utility functions in various files
- Commented-out code from previous refactors

### Required Changes

**Step 4.2.1: Identify dead code**

```bash
# Find files with zero requires
grep -r "eventBroadcaster" src/ --include="*.js" --include="*.cjs"
# Result: nothing found (dead code confirmed)

# Find unused exports
npm install --save-dev depcheck
npx depcheck
```

**Step 4.2.2: Remove unused files**

```bash
# Delete with git (not rm) so history is preserved
git rm src/backend/utils/eventBroadcaster.cjs

# Remove any other unused files similarly
```

**Step 4.2.3: Remove commented-out code**

Audit `src/backend/controllers/OnlineController.cjs` and other large files for commented-out code. Delete it.

### Testing
1. **Build test:** `npm run dist` → build should succeed
2. **Runtime test:** Start app → no errors about missing eventBroadcaster
3. **Feature test:** All existing features still work

### Acceptance Criteria
- [ ] eventBroadcaster.cjs deleted
- [ ] All commented-out code removed
- [ ] Build size slightly reduced
- [ ] All tests still pass
- [ ] No broken imports

---

## 4.3 Large Component Refactoring

**Location:** `src/frontend/pages/InventoryRestock.jsx` (2,673 lines)  
**Severity:** MEDIUM  
**Impact:** Component too large to test, maintain, or reason about  

### Current Issues
- Single component handles state, UI, and API calls
- Logic tightly coupled to JSX
- Impossible to test business logic separately
- Hard to add features without breaking things

### Required Changes (Prioritize most painful parts first)

**Step 4.3.1: Extract API layer**

Create `src/frontend/api/inventory.js`:
```javascript
export async function fetchRestockData(filters) {
    const response = await electronAPI.getRestockData(filters);
    if (!response.ok) throw new Error(response.message);
    return response.data;
}

export async function submitRestock(items) {
    const response = await electronAPI.submitRestock(items);
    if (!response.ok) throw new Error(response.message);
    return response.data;
}
```

**Step 4.3.2: Extract custom hook for state**

Create `src/frontend/hooks/useInventoryRestock.js`:
```javascript
export function useInventoryRestock() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const load = async (filters) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchRestockData(filters);
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const submit = async (items) => {
        setLoading(true);
        try {
            await submitRestock(items);
            // Reload data
            await load({});
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, load, submit };
}
```

**Step 4.3.3: Simplify component**

```javascript
// BEFORE: 2,673 lines in one component
export default function InventoryRestock() {
    // ... 1000 lines of state management
    // ... 1000 lines of API calls
    // ... 600 lines of JSX
}

// AFTER: Simple component
import { useInventoryRestock } from '../hooks/useInventoryRestock';
import RestockTable from './RestockTable';
import RestockFilters from './RestockFilters';

export default function InventoryRestock() {
    const { data, loading, error, load, submit } = useInventoryRestock();

    useEffect(() => {
        load({});
    }, []);

    return (
        <div className="inventory-restock">
            <RestockFilters onFilter={load} />
            {error && <div className="error">{error}</div>}
            <RestockTable data={data} loading={loading} onSubmit={submit} />
        </div>
    );
}
```

**Step 4.3.4: Extract sub-components**

Create `src/frontend/components/RestockTable.jsx` (handles table rendering)  
Create `src/frontend/components/RestockFilters.jsx` (handles filters)  
Create `src/frontend/components/RestockForm.jsx` (handles submission form)  

Each should be <300 lines.

### Testing
1. **Hook test:** useInventoryRestock loads data correctly
2. **API test:** fetchRestockData fetches from correct endpoint
3. **Component test:** Component renders with mock hook
4. **Integration test:** Full flow still works (load → filter → submit)
5. **Error test:** Error handling works through new structure

### Acceptance Criteria
- [ ] InventoryRestock.jsx reduced to <500 lines
- [ ] API layer separated into api/inventory.js
- [ ] Custom hook handles state management
- [ ] Sub-components extracted (Table, Filters, Form)
- [ ] All tests updated and passing
- [ ] No regression in features

---

## 4.4 SalesView Component Refactoring

**Location:** `src/frontend/pages/sales/SalesView.jsx` (1,659 lines)  
**Severity:** MEDIUM  
**Impact:** Printing, checkout, and state logic tightly coupled  

### Current Issues
- Single component handles POS logic, printing, checkout
- Print logic mixed with UI logic
- State management convoluted
- Testing is nearly impossible

### Required Changes (Same pattern as InventoryRestock)

**Step 4.4.1: Extract print service**

Create `src/frontend/services/printService.js`:
```javascript
export async function printReceipt(saleData) {
    return await electronAPI.print.receipt(saleData);
}

export async function printLabel(productData) {
    return await electronAPI.print.label(productData);
}
```

**Step 4.4.2: Extract POS hooks**

Create `src/frontend/hooks/usePointOfSale.js`:
```javascript
export function usePointOfSale() {
    const [cart, setCart] = useState([]);
    const [total, setTotal] = useState(0);
    const [processing, setProcessing] = useState(false);

    const addItem = (product) => { /* ... */ };
    const removeItem = (productId) => { /* ... */ };
    const checkout = async () => { /* ... */ };
    const printReceipt = async () => { /* ... */ };

    return { cart, total, addItem, removeItem, checkout, printReceipt };
}
```

**Step 4.4.3: Extract sub-components**

Create `src/frontend/components/Cart.jsx`  
Create `src/frontend/components/Checkout.jsx`  
Create `src/frontend/components/Receipt.jsx`  

Each <300 lines, each testable independently.

### Testing
- [ ] Print service formats receipt correctly
- [ ] usePointOfSale manages cart state
- [ ] Cart component renders items
- [ ] Checkout component processes payment
- [ ] Receipt component displays correctly
- [ ] Full checkout flow still works

### Acceptance Criteria
- [ ] SalesView.jsx reduced to <500 lines
- [ ] Print logic extracted to service
- [ ] POS state in custom hook
- [ ] Sub-components testable independently
- [ ] No regression in features or printing

---

## 4.5 Memory Leak Fixes

**Location:** `electron.cjs`, event listeners  
**Severity:** LOW  
**Impact:** Memory grows over time, app becomes sluggish  

### Current Issues
- Event listeners not removed in cleanup
- Timers not cleared in component unmounts
- Database connections leak in error scenarios

### Required Changes

**Step 4.5.1: Add proper cleanup**

In `electron.cjs`:
```javascript
// BEFORE - listeners never removed
ipcMain.on('data-update', (event, data) => {
    // ... handler
});

// AFTER - cleanup on window close
const dataUpdateHandler = (event, data) => {
    // ... handler
};

ipcMain.on('data-update', dataUpdateHandler);

mainWindow.on('close', () => {
    ipcMain.removeListener('data-update', dataUpdateHandler);
});
```

**Step 4.5.2: Cleanup React component timers**

In components:
```javascript
// BEFORE
useEffect(() => {
    setInterval(() => {
        // Poll something
    }, 1000);
}, []);

// AFTER
useEffect(() => {
    const interval = setInterval(() => {
        // Poll something
    }, 1000);
    
    return () => clearInterval(interval);  // Cleanup
}, []);
```

**Step 4.5.3: Audit database connection cleanup**

In `src/online-server/runtime.cjs`:
```javascript
async function stopOnlineServer() {
    // Make sure these actually close
    if (runtime?.server) {
        await new Promise(resolve => runtime.server.close(resolve));
    }
    await closeMongo();  // Verify this closes all connections
    runtime = null;
}
```

### Testing
1. **Memory test:** Run app for 1 hour, monitor memory usage → should stay constant
2. **Listener cleanup test:** Verify ipcMain.listeners() empty after window close
3. **Timer cleanup test:** Component unmount → timers cleared
4. **Connection test:** App close → all DB connections closed

### Acceptance Criteria
- [ ] All event listeners unregistered on cleanup
- [ ] All timers cleared on component unmount
- [ ] Database connections closed on app exit
- [ ] Memory usage stable over time
- [ ] No "connection still open" errors on shutdown

---

# Testing & Validation Checklist

Complete after all phases:

## Security Testing
- [ ] CORS whitelist enforced (no wildcard)
- [ ] Organization data isolated (no cross-org data access)
- [ ] IPC channels whitelisted (no undocumented access)
- [ ] Rate limiting active on enumeration
- [ ] JWT secrets enforced 32+ characters
- [ ] Tokens expire automatically

## Architecture Testing
- [ ] Single instance lock prevents duplicates
- [ ] Startup errors visible to users (not silent)
- [ ] Server startup fails gracefully (no generic errors)
- [ ] Config validation works in packaged build
- [ ] Both dev and packaged runtimes tested

## Observability Testing
- [ ] Structured logs created at `userData/logs/`
- [ ] Errors captured and sent to Sentry
- [ ] /health endpoint returns current status
- [ ] Printer discovery doesn't block startup

## Code Quality Testing
- [ ] Search handlers filter correctly
- [ ] Dead code removed (eventBroadcaster.cjs gone)
- [ ] InventoryRestock component <500 lines
- [ ] SalesView component <500 lines
- [ ] Memory leaks fixed (stable memory usage)

## Integration Testing
- [ ] Full login flow works
- [ ] Create sale, print receipt
- [ ] Update inventory, search products
- [ ] Multi-user concurrent access
- [ ] Offline mode (if applicable)

---

# Deployment Strategy

## Pre-Release Checklist
1. [ ] All phases complete and tested
2. [ ] Security audit passed
3. [ ] Load testing done (can handle peak tills)
4. [ ] Staged rollout plan (5% → 25% → 100%)
5. [ ] Runbook for common support issues

## Release Timeline
- **Day 1-7:** Phases 1-2 (Security + Ops)
- **Day 8-10:** Phase 3 parallel with Phase 2 tail
- **Day 11-21:** Phase 4 (Code quality)
- **Day 22-24:** Full regression testing
- **Day 25-28:** Staged production rollout

## Rollback Plan
- Build available for 1 week after release
- Can pin users to previous version if issues found
- Auto-updater respects downgrade requests

---

# Effort Summary

| Phase | Est. Hours | Timeline | Blocker |
|-------|-----------|----------|---------|
| 1: Security | 40-50 | 1-2 weeks | YES |
| 2: Architecture | 50-60 | 2-3 weeks | YES |
| 3: Observability | 30-40 | 1-2 weeks | Parallel Phase 2 tail |
| 4: Code Quality | 40-50 | 2-3 weeks | After Phases 1-3 |
| **TOTAL** | **160-200** | **3-4 weeks** | |

---

# Quick Reference

### For Lower-Tier Models
- Each "Step" section has specific before/after code
- Follow steps sequentially
- Run tests after each major change
- Commit frequently (one fix per commit)
- Use file paths provided for navigation

### Critical Path (minimum viable security)
1. Phase 1.1-1.2: CORS + Org scope bypass (3 days)
2. Phase 1.3: IPC whitelist (1 day)
3. Phase 2.1: Startup errors visible (2 days)
4. Phase 2.2: Single instance lock (1 day)

This 7-day MVP prevents the 4 most critical attacks.

