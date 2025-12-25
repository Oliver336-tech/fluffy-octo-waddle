#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const args = process.argv.slice(2);
const cwd = process.cwd();

const buildResult = spawnSync('tsc', ['--project', 'tsconfig.json'], {
  cwd,
  stdio: 'inherit'
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const testArgs = ['--test'];
if (args[0]) {
  testArgs.push('--test-name-pattern', args[0]);
}

const testWorkingDirectory = path.join(cwd, 'dist');

const testResult = spawnSync(process.execPath, testArgs, {
  cwd: testWorkingDirectory,
  stdio: 'inherit'
});

process.exit(testResult.status ?? 1);
