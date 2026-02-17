import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { KindRegistry } from './kind-registry.js';

const HANDLERS_DIR = '/test/handlers';

describe('KindRegistry', () => {
  describe('resolve() — exact match', () => {
    it('resolves kind 1 to kind-1-text-note.md', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.resolve(1)).toBe(path.join(HANDLERS_DIR, 'kind-1-text-note.md'));
    });

    it('resolves kind 1059 to kind-1059-gift-wrap.md', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.resolve(1059)).toBe(path.join(HANDLERS_DIR, 'kind-1059-gift-wrap.md'));
    });
  });

  describe('resolve() — range match', () => {
    it('resolves kind 5001 to kind-5xxx-dvm-request.md', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.resolve(5001)).toBe(
        path.join(HANDLERS_DIR, 'kind-5xxx-dvm-request.md'),
      );
    });

    it('resolves kind 5999 to kind-5xxx-dvm-request.md', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.resolve(5999)).toBe(
        path.join(HANDLERS_DIR, 'kind-5xxx-dvm-request.md'),
      );
    });

    it('resolves kind 5000 (range start) to kind-5xxx-dvm-request.md', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.resolve(5000)).toBe(
        path.join(HANDLERS_DIR, 'kind-5xxx-dvm-request.md'),
      );
    });
  });

  describe('resolve() — unhandled kinds', () => {
    const unhandledKinds = [0, 3, 6, 7, 6000, 7000, 10032, 23194, 23195, 99999];

    it.each(unhandledKinds)('returns null for kind %i', (kind) => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.resolve(kind)).toBeNull();
    });
  });

  describe('classify()', () => {
    it('returns regular for kinds 1, 7, 1059, 5001', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.classify(1)).toBe('regular');
      expect(registry.classify(7)).toBe('regular');
      expect(registry.classify(1059)).toBe('regular');
      expect(registry.classify(5001)).toBe('regular');
    });

    it('returns regular for kinds >= 40000 (fallback)', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.classify(40000)).toBe('regular');
      expect(registry.classify(50000)).toBe('regular');
    });

    it('returns replaceable for kinds 0, 3, 10032', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.classify(0)).toBe('replaceable');
      expect(registry.classify(3)).toBe('replaceable');
      expect(registry.classify(10032)).toBe('replaceable');
    });

    it('returns ephemeral for kinds 20000, 23194, 23195', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.classify(20000)).toBe('ephemeral');
      expect(registry.classify(23194)).toBe('ephemeral');
      expect(registry.classify(23195)).toBe('ephemeral');
    });

    it('returns parameterized-replaceable for kind 30023', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      expect(registry.classify(30023)).toBe('parameterized-replaceable');
    });
  });

  describe('getAllRegisteredKinds()', () => {
    it('returns all registered entries', () => {
      const registry = new KindRegistry(HANDLERS_DIR);
      const entries = registry.getAllRegisteredKinds();
      expect(entries).toEqual([
        { kind: 1, handlerPath: 'kind-1-text-note.md' },
        { kind: 1059, handlerPath: 'kind-1059-gift-wrap.md' },
        { kind: '5000-5999', handlerPath: 'kind-5xxx-dvm-request.md' },
      ]);
    });
  });
});
