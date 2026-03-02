const { spawnSync } = require('child_process');
const electron = require('electron');

const result = spawnSync(electron, ['.'], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname,
});

process.exit(result.status ?? 0);
