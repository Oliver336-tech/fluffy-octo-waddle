declare module 'node:fs/promises' {
  const value: any;
  export default value;
}

declare module 'node:fs' {
  export interface Stats {
    isDirectory(): boolean;
  }
  const value: any;
  export default value;
}

declare module 'node:path' {
  const value: any;
  export default value;
}

declare module 'node:crypto' {
  export function randomUUID(): string;
}

declare module 'node:os' {
  const value: any;
  export default value;
}

declare module 'node:test' {
  type TestFn = (name: string, fn: (...args: any[]) => any) => any;
  const test: TestFn;
  export = test;
}

declare module 'node:assert/strict' {
  const value: any;
  export default value;
}

declare const process: any;
declare const __dirname: string;
