const fs = require('fs');
const path = require('path');

// This module is required from both the standalone online-server process
// (plain Node, no Electron) and the Electron main process (embedded server),
// so the log location can't unconditionally depend on Electron's app.getPath.
function resolveLogDir() {
    try {
        const { app } = require('electron');
        if (app && typeof app.getPath === 'function' && app.isReady()) {
            return path.join(app.getPath('userData'), 'logs');
        }
    } catch {
        // Not running inside Electron, or app isn't ready yet — fall through.
    }
    return path.join(process.cwd(), 'logs');
}

const MAX_LOG_BYTES = 5 * 1024 * 1024;

function getLogFilePath() {
    return path.join(resolveLogDir(), 'app.log');
}

function rotateIfNeeded(logFile) {
    try {
        if (fs.statSync(logFile).size > MAX_LOG_BYTES) {
            fs.renameSync(logFile, `${logFile}.1`);
        }
    } catch {
        // File doesn't exist yet — nothing to rotate.
    }
}

function write(level, service, message, meta) {
    const logFile = getLogFilePath();
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${service}] ${message}`, meta && Object.keys(meta).length ? meta : '');

    try {
        fs.mkdirSync(path.dirname(logFile), { recursive: true });
        rotateIfNeeded(logFile);
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            service,
            message,
            ...(meta && Object.keys(meta).length ? { meta } : {})
        };
        fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
    } catch (writeError) {
        console.error('[Logger] Failed to write log entry:', writeError.message);
    }
}

function createLogger(service) {
    return {
        debug: (message, meta) => write('debug', service, message, meta),
        info: (message, meta) => write('info', service, message, meta),
        warn: (message, meta) => write('warn', service, message, meta),
        error: (message, meta) => write('error', service, message, meta)
    };
}

module.exports = { createLogger, getLogFilePath };
