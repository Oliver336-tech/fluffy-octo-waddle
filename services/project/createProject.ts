import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface CreateProjectResult {
  projectName: string;
  projectDirName: string;
  projectDir: string;
  templatePath: string;
  createdAt: string;
}

export interface CreateProjectOptions {
  uniqueSuffix?: string;
}

function getWorkspaceRoot(): string {
  const workspaceRoot = process.env.WORKSPACE_ROOT;

  if (!workspaceRoot) {
    throw new Error('WORKSPACE_ROOT is not set');
  }

  return path.resolve(workspaceRoot);
}

function assertInsideWorkspace(targetPath: string, workspaceRoot: string): void {
  const relative = path.relative(workspaceRoot, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path traversal outside of WORKSPACE_ROOT is not allowed');
  }
}

function sanitizeProjectName(projectName: string): void {
  if (projectName.includes(path.sep)) {
    throw new Error('Project name cannot include path separators');
  }
  if (!projectName.trim()) {
    throw new Error('Project name cannot be empty');
  }
}

async function ensureTemplateDirectory(templatePath: string): Promise<void> {
  let stats: Stats;
  try {
    stats = await fs.stat(templatePath);
  } catch (error) {
    throw new Error(`Template path does not exist: ${templatePath}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Template path must be a directory: ${templatePath}`);
  }
}

export async function createProject(
  templatePath: string,
  projectName: string,
  options: CreateProjectOptions = {}
): Promise<CreateProjectResult> {
  const workspaceRoot = getWorkspaceRoot();
  sanitizeProjectName(projectName);

  const resolvedTemplatePath = path.resolve(workspaceRoot, templatePath);
  assertInsideWorkspace(resolvedTemplatePath, workspaceRoot);
  await ensureTemplateDirectory(resolvedTemplatePath);

  const uniqueSuffix = options.uniqueSuffix ?? `${Date.now()}-${randomUUID()}`;
  const projectDirName = `${projectName}-${uniqueSuffix}`;
  const projectDir = path.join(workspaceRoot, projectDirName);
  assertInsideWorkspace(projectDir, workspaceRoot);

  try {
    await fs.mkdir(projectDir, { recursive: false });
  } catch (error: any) {
    if (error?.code === 'EEXIST') {
      throw new Error(`Project directory already exists: ${projectDir}`);
    }
    throw error;
  }

  await fs.cp(resolvedTemplatePath, projectDir, { recursive: true });

  return {
    projectName,
    projectDirName,
    projectDir,
    templatePath: resolvedTemplatePath,
    createdAt: new Date().toISOString()
  };
}
