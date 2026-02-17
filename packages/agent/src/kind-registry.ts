import path from 'node:path';

export type KindClassification =
  | 'regular'
  | 'replaceable'
  | 'ephemeral'
  | 'parameterized-replaceable';

export interface KindRegistryEntry {
  handlerPath: string;
}

interface RangeEntry {
  min: number;
  max: number;
  entry: KindRegistryEntry;
}

export class KindRegistry {
  private readonly handlersDir: string;
  private readonly exactMatch: Map<number, KindRegistryEntry> = new Map();
  private readonly rangeMatch: RangeEntry[] = [];

  constructor(handlersDir: string) {
    this.handlersDir = handlersDir;

    // Pre-populate exact matches
    this.exactMatch.set(1, { handlerPath: 'kind-1-text-note.md' });
    this.exactMatch.set(1059, { handlerPath: 'kind-1059-gift-wrap.md' });

    // Pre-populate range matches
    this.rangeMatch.push({
      min: 5000,
      max: 5999,
      entry: { handlerPath: 'kind-5xxx-dvm-request.md' },
    });
  }

  resolve(kind: number): string | null {
    const exact = this.exactMatch.get(kind);
    if (exact) {
      return path.join(this.handlersDir, exact.handlerPath);
    }

    for (const range of this.rangeMatch) {
      if (kind >= range.min && kind <= range.max) {
        return path.join(this.handlersDir, range.entry.handlerPath);
      }
    }

    return null;
  }

  classify(kind: number): KindClassification {
    if (kind === 0 || kind === 3 || (kind >= 10000 && kind < 20000)) {
      return 'replaceable';
    }
    if (kind >= 20000 && kind < 30000) {
      return 'ephemeral';
    }
    if (kind >= 30000 && kind < 40000) {
      return 'parameterized-replaceable';
    }
    return 'regular';
  }

  getAllRegisteredKinds(): Array<{ kind: number | string; handlerPath: string }> {
    const entries: Array<{ kind: number | string; handlerPath: string }> = [];

    for (const [kind, entry] of this.exactMatch) {
      entries.push({ kind, handlerPath: entry.handlerPath });
    }

    for (const range of this.rangeMatch) {
      entries.push({
        kind: `${range.min}-${range.max}`,
        handlerPath: range.entry.handlerPath,
      });
    }

    return entries;
  }
}
