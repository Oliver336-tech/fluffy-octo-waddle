import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface InitRepoOptions {
  /**
   * Perform an empty initial commit when no commits exist yet.
   */
  initialCommit?: boolean;
}

export interface RepoMetadata {
  head: string | null;
  branch: string | null;
  hasCommit: boolean;
}

interface ExecResult {
  stdout: string;
  stderr: string;
}

function execGit(args: string[], cwd: string): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd }, (error: Error | null, stdout?: string | Buffer, stderr?: string | Buffer) => {
      if (error) {
        const enriched = Object.assign(error, {
          stdout: (error as { stdout?: string }).stdout ?? String(stdout ?? ''),
          stderr: (error as { stderr?: string }).stderr ?? String(stderr ?? ''),
        });
        return reject(enriched);
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

async function hasExistingCommit(cwd: string): Promise<boolean> {
  try {
    await execGit(['rev-parse', '--verify', 'HEAD'], cwd);
    return true;
  } catch (error: unknown) {
    const stderr = (error as { stderr?: string }).stderr ?? '';
    if (
      stderr.includes('Needed a single revision') ||
      stderr.includes('unknown revision or path not in the working tree')
    ) {
      return false;
    }
    throw error;
  }
}

async function getHeadRef(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(['rev-parse', 'HEAD'], cwd);
    const trimmed = stdout.trim();
    return trimmed.length ? trimmed : null;
  } catch {
    return null;
  }
}

async function getBranchName(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execGit(['symbolic-ref', '--quiet', '--short', 'HEAD'], cwd);
    const trimmed = stdout.trim();
    return trimmed.length ? trimmed : null;
  } catch {
    return null;
  }
}

export async function initRepo(repoPath: string, options: InitRepoOptions = {}): Promise<RepoMetadata> {
  const cwd = path.resolve(repoPath);
  await fs.mkdir(cwd, { recursive: true });

  await execGit(['init'], cwd);
  await execGit(['config', '--local', '--add', 'safe.directory', cwd], cwd);

  let hasCommit = await hasExistingCommit(cwd);

  if (options.initialCommit && !hasCommit) {
    await execGit(
      ['-c', 'user.name=Automation', '-c', 'user.email=automation@example.com', 'commit', '--allow-empty', '-m', 'Initial commit'],
      cwd,
    );
    hasCommit = true;
  }

  const head = await getHeadRef(cwd);
  const branch = await getBranchName(cwd);

  return {
    head,
    branch,
    hasCommit: hasCommit || Boolean(head),
  };
}

export default initRepo;
