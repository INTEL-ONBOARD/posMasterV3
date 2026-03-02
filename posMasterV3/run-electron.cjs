/**
 * run-electron.cjs
 *
 * Launches the Electron app while temporarily hiding node_modules/electron
 * so that Electron's built-in require('electron') is not shadowed by the
 * npm package helper (which returns a binary path string, not the API).
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const electronBinOriginal = require('./node_modules/electron');
const electronPkg = path.join(__dirname, 'node_modules', 'electron');
const electronPkgHidden = path.join(__dirname, 'node_modules', '_electron_hidden');

// After renaming node_modules/electron → node_modules/_electron_hidden, the
// binary path must also be remapped so spawnSync can still find it.
const electronBin = electronBinOriginal.replace(electronPkg, electronPkgHidden);

let renamed = false;
try {
  fs.renameSync(electronPkg, electronPkgHidden);
  renamed = true;
} catch (e) {
  console.error('Could not hide node_modules/electron:', e.message);
  process.exit(1);
}

function restore() {
  if (renamed) {
    try {
      fs.renameSync(electronPkgHidden, electronPkg);
    } catch (e) {
      console.error('Warning: could not restore node_modules/electron:', e.message);
    }
  }
}

process.on('exit', restore);
process.on('SIGINT', () => { restore(); process.exit(0); });
process.on('SIGTERM', () => { restore(); process.exit(0); });

const result = spawnSync(electronBin, ['.'], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname,
});

restore();
renamed = false;

process.exit(result.status ?? 0);
