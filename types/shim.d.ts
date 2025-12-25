declare module 'node:child_process' {
  export interface ExecFileOptions {
    cwd?: string;
  }

  export type ExecFileCallback = (error: Error | null, stdout?: string | Buffer, stderr?: string | Buffer) => void;

  export function execFile(
    file: string,
    args: ReadonlyArray<string>,
    options: ExecFileOptions,
    callback: ExecFileCallback,
  ): void;
}

declare module 'child_process' {
  export * from 'node:child_process';
}

declare module 'node:fs' {
  export const promises: {
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  };
}

declare module 'fs' {
  export * from 'node:fs';
}

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
}

declare module 'path' {
  export * from 'node:path';
}

declare module 'node:test' {
  export const test: any;
  export const it: any;
  export const describe: any;
  export const before: any;
  export const after: any;
  export const beforeEach: any;
  export const afterEach: any;
  export const mock: any;
}

declare module 'node:assert/strict' {
  const assert: any;
  export = assert;
}

declare const Buffer: any;
type Buffer = any;
