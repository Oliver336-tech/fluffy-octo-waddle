#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

const buildResult = spawnSync('tsc', ['-p', path.join(repoRoot, 'tsconfig.json')], { stdio: 'inherit' });
if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const patternArgs = process.argv.length > 2 ? ['--test-name-pattern', process.argv.slice(2).join(' ')] : [];
const testFile = path.join(repoRoot, 'dist/services/git/initRepo.test.js');

const testResult = spawnSync(process.execPath, ['--test', ...patternArgs, testFile], { stdio: 'inherit' });
if (testResult.status !== 0) {
  process.exit(testResult.status ?? 1);
}
