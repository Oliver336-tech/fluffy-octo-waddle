import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createProject } from '../services/project/createProject';

const REPO_TEMPLATE_PATH = path.resolve(__dirname, '..', 'templates', 'node-basic');

type Workspace = {
  workspaceRoot: string;
};

async function createWorkspaceWithTemplate(): Promise<Workspace> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-'));
  const templateDestination = path.join(workspaceRoot, 'templates', 'node-basic');
  await fs.mkdir(path.dirname(templateDestination), { recursive: true });
  await fs.cp(REPO_TEMPLATE_PATH, templateDestination, { recursive: true });

  return { workspaceRoot };
}

test('creates a project from the template inside the workspace root', async () => {
  const { workspaceRoot } = await createWorkspaceWithTemplate();
  const originalWorkspaceRoot = process.env.WORKSPACE_ROOT;
  process.env.WORKSPACE_ROOT = workspaceRoot;

  try {
    const result = await createProject('templates/node-basic', 'demo');

    assert.ok(result.projectDirName.startsWith('demo-'));
    assert.ok(result.projectDir.includes(result.projectDirName));

    const projectStat = await fs.stat(result.projectDir);
    assert.ok(projectStat.isDirectory());

    const packageJson = await fs.readFile(path.join(result.projectDir, 'package.json'), 'utf8');
    assert.ok(packageJson.includes('"name": "node-basic"'));
  } finally {
    process.env.WORKSPACE_ROOT = originalWorkspaceRoot;
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test('prevents creating a project when a directory already exists', async () => {
  const { workspaceRoot } = await createWorkspaceWithTemplate();
  const originalWorkspaceRoot = process.env.WORKSPACE_ROOT;
  process.env.WORKSPACE_ROOT = workspaceRoot;

  try {
    const uniqueSuffix = 'fixed-suffix';
    await createProject('templates/node-basic', 'demo', { uniqueSuffix });

    await assert.rejects(
      () => createProject('templates/node-basic', 'demo', { uniqueSuffix }),
      /already exists/
    );
  } finally {
    process.env.WORKSPACE_ROOT = originalWorkspaceRoot;
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

test('rejects template paths that attempt traversal outside the workspace', async () => {
  const { workspaceRoot } = await createWorkspaceWithTemplate();
  const originalWorkspaceRoot = process.env.WORKSPACE_ROOT;
  process.env.WORKSPACE_ROOT = workspaceRoot;

  try {
    await assert.rejects(
      () => createProject('../outside', 'demo'),
      /Path traversal outside of WORKSPACE_ROOT/
    );
  } finally {
    process.env.WORKSPACE_ROOT = originalWorkspaceRoot;
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});
