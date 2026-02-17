import { readFile } from 'node:fs/promises';

export class HandlerNotFoundError extends Error {
  readonly path: string;

  constructor(handlerPath: string) {
    super(`Handler file not found: ${handlerPath}`);
    this.name = 'HandlerNotFoundError';
    this.path = handlerPath;
  }
}

export class HandlerLoader {
  private readonly cache: Map<string, string> = new Map();

  async load(handlerPath: string): Promise<string> {
    const cached = this.cache.get(handlerPath);
    if (cached !== undefined) {
      return cached;
    }

    let content: string;
    try {
      content = await readFile(handlerPath, 'utf-8');
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        throw new HandlerNotFoundError(handlerPath);
      }
      throw err;
    }

    this.cache.set(handlerPath, content);
    return content;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
