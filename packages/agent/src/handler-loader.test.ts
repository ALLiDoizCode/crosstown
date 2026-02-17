import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HandlerLoader, HandlerNotFoundError } from './handler-loader.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';

const mockReadFile = vi.mocked(readFile);

describe('HandlerLoader', () => {
  let loader: HandlerLoader;

  beforeEach(() => {
    loader = new HandlerLoader();
    vi.clearAllMocks();
  });

  it('loads a handler file and returns its content as a string', async () => {
    mockReadFile.mockResolvedValueOnce('# Handler Content\nSome instructions here');

    const content = await loader.load('/handlers/kind-1-text-note.md');

    expect(content).toBe('# Handler Content\nSome instructions here');
    expect(mockReadFile).toHaveBeenCalledWith('/handlers/kind-1-text-note.md', 'utf-8');
  });

  it('second load of same file returns cached content (only one read)', async () => {
    mockReadFile.mockResolvedValueOnce('cached content');

    await loader.load('/handlers/kind-1-text-note.md');
    const second = await loader.load('/handlers/kind-1-text-note.md');

    expect(second).toBe('cached content');
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it('clearCache() causes next load to re-read from filesystem', async () => {
    mockReadFile.mockResolvedValueOnce('first read');
    mockReadFile.mockResolvedValueOnce('second read');

    await loader.load('/handlers/test.md');
    loader.clearCache();
    const content = await loader.load('/handlers/test.md');

    expect(content).toBe('second read');
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });

  it('throws HandlerNotFoundError for non-existent file path', async () => {
    const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    mockReadFile.mockRejectedValueOnce(enoentError);

    const promise = loader.load('/handlers/missing.md');
    await expect(promise).rejects.toThrow(HandlerNotFoundError);
  });

  it('HandlerNotFoundError includes descriptive message and path', async () => {
    const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    mockReadFile.mockRejectedValueOnce(enoentError);

    try {
      await loader.load('/handlers/missing.md');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HandlerNotFoundError);
      expect((err as HandlerNotFoundError).message).toBe(
        'Handler file not found: /handlers/missing.md',
      );
      expect((err as HandlerNotFoundError).path).toBe('/handlers/missing.md');
    }
  });

  it('re-throws non-ENOENT errors', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('Permission denied'));

    await expect(loader.load('/handlers/noaccess.md')).rejects.toThrow('Permission denied');
  });

  it('getCacheSize() reflects number of unique loaded handlers', async () => {
    mockReadFile.mockResolvedValueOnce('a');
    mockReadFile.mockResolvedValueOnce('b');

    expect(loader.getCacheSize()).toBe(0);
    await loader.load('/handlers/a.md');
    expect(loader.getCacheSize()).toBe(1);
    await loader.load('/handlers/b.md');
    expect(loader.getCacheSize()).toBe(2);
  });
});
