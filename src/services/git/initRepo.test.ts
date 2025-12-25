import assert from 'node:assert/strict';
import childProcess = require('node:child_process');
import path from 'node:path';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { initRepo } from './initRepo';

type ExecPlan = { stdout?: string; stderr?: string; error?: Error };

describe('initRepo', () => {
  let plans: ExecPlan[];
  let calls: Array<{ cmd: string; args: string[]; cwd: string | undefined }>;

  beforeEach(() => {
    plans = [];
    calls = [];

    mock.method(childProcess, 'execFile', (cmd: any, args: any, options: any, callback: any) => {
      const cb = (typeof options === 'function' ? options : callback) as
        | ((error: ExecPlan['error'] | null, stdout?: ExecPlan['stdout'], stderr?: ExecPlan['stderr']) => void)
        | undefined;

      const cwd = (typeof options === 'object' && options?.cwd ? options.cwd : undefined) as string | undefined;
      calls.push({
        cmd: String(cmd),
        args: (args as string[]) ?? [],
        cwd,
      });

      const plan = plans.shift() ?? {};
      const error = plan.error ?? null;
      cb?.(error, plan.stdout ?? '', plan.stderr ?? '');
      return undefined as never;
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('initializes git and returns metadata without initial commit', async () => {
    const repoPath = '/tmp/basic-repo';
    plans.push(
      {}, // git init
      {}, // git config --local --add safe.directory
      { error: Object.assign(new Error('no commit'), { stderr: 'Needed a single revision' }) }, // rev-parse --verify HEAD
      { error: new Error('no head') }, // rev-parse HEAD
      { stdout: 'main\n' }, // symbolic-ref --short HEAD
    );

    const result = await initRepo(repoPath);

    assert.deepStrictEqual(calls, [
      { cmd: 'git', args: ['init'], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['config', '--local', '--add', 'safe.directory', path.resolve(repoPath)], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['rev-parse', '--verify', 'HEAD'], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['rev-parse', 'HEAD'], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['symbolic-ref', '--quiet', '--short', 'HEAD'], cwd: path.resolve(repoPath) },
    ]);

    assert.deepStrictEqual(result, { head: null, branch: 'main', hasCommit: false });
  });

  it('creates an initial commit when requested', async () => {
    const repoPath = '/tmp/init-commit-repo';
    plans.push(
      {}, // git init
      {}, // git config
      { error: Object.assign(new Error('no commit'), { stderr: 'Needed a single revision' }) }, // rev-parse --verify HEAD
      {}, // git commit --allow-empty
      { stdout: 'abc123\n' }, // rev-parse HEAD
      { stdout: 'main\n' }, // symbolic-ref --short HEAD
    );

    const result = await initRepo(repoPath, { initialCommit: true });

    assert.deepStrictEqual(calls, [
      { cmd: 'git', args: ['init'], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['config', '--local', '--add', 'safe.directory', path.resolve(repoPath)], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['rev-parse', '--verify', 'HEAD'], cwd: path.resolve(repoPath) },
      {
        cmd: 'git',
        args: [
          '-c',
          'user.name=Automation',
          '-c',
          'user.email=automation@example.com',
          'commit',
          '--allow-empty',
          '-m',
          'Initial commit',
        ],
        cwd: path.resolve(repoPath),
      },
      { cmd: 'git', args: ['rev-parse', 'HEAD'], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['symbolic-ref', '--quiet', '--short', 'HEAD'], cwd: path.resolve(repoPath) },
    ]);

    assert.deepStrictEqual(result, { head: 'abc123', branch: 'main', hasCommit: true });
  });

  it('is idempotent when commits already exist', async () => {
    const repoPath = '/tmp/existing-commit-repo';
    plans.push(
      {}, // git init
      {}, // git config
      { stdout: '' }, // rev-parse --verify HEAD (success path)
      { stdout: 'def456\n' }, // rev-parse HEAD
      { stdout: 'main\n' }, // symbolic-ref --short HEAD
    );

    const result = await initRepo(repoPath, { initialCommit: true });

    assert.deepStrictEqual(calls, [
      { cmd: 'git', args: ['init'], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['config', '--local', '--add', 'safe.directory', path.resolve(repoPath)], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['rev-parse', '--verify', 'HEAD'], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['rev-parse', 'HEAD'], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['symbolic-ref', '--quiet', '--short', 'HEAD'], cwd: path.resolve(repoPath) },
    ]);

    assert.deepStrictEqual(result, { head: 'def456', branch: 'main', hasCommit: true });
  });

  it('surfaces unexpected rev-parse errors', async () => {
    const repoPath = '/tmp/error-repo';
    const failure = Object.assign(new Error('boom'), { stderr: 'fatal: boom' });
    plans.push(
      {}, // git init
      {}, // git config
      { error: failure }, // rev-parse --verify HEAD
    );

    await assert.rejects(() => initRepo(repoPath, { initialCommit: true }), failure);

    assert.deepStrictEqual(calls, [
      { cmd: 'git', args: ['init'], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['config', '--local', '--add', 'safe.directory', path.resolve(repoPath)], cwd: path.resolve(repoPath) },
      { cmd: 'git', args: ['rev-parse', '--verify', 'HEAD'], cwd: path.resolve(repoPath) },
    ]);
  });
});
