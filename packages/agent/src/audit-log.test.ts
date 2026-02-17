import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuditLogger } from './audit-log.js';
import type { AuditEntry } from './audit-log.js';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  afterEach(() => {
    if (logger) {
      logger.close();
    }
  });

  describe('log and query', () => {
    beforeEach(() => {
      logger = new AuditLogger();
    });

    it('log() inserts a record retrievable by query()', () => {
      const entry: AuditEntry = {
        eventId: 'event123',
        eventKind: 1,
        eventPubkey: 'pubkey123',
        actionType: 'reply',
        actionJson: '{"action":"reply"}',
        inputTokens: 100,
        outputTokens: 50,
        retried: false,
        rateLimited: false,
        sanitized: false,
      };

      logger.log(entry);

      const records = logger.query({ eventId: 'event123' });

      expect(records).toHaveLength(1);
      expect(records[0]!.eventId).toBe('event123');
      expect(records[0]!.eventKind).toBe(1);
      expect(records[0]!.eventPubkey).toBe('pubkey123');
      expect(records[0]!.actionType).toBe('reply');
      expect(records[0]!.actionJson).toBe('{"action":"reply"}');
      expect(records[0]!.inputTokens).toBe(100);
      expect(records[0]!.outputTokens).toBe(50);
      expect(records[0]!.retried).toBe(false);
      expect(records[0]!.rateLimited).toBe(false);
      expect(records[0]!.sanitized).toBe(false);
      expect(records[0]!.id).toBeGreaterThan(0);
      expect(records[0]!.createdAt).toBeGreaterThan(0);
    });
  });

  describe('query filters', () => {
    beforeEach(() => {
      logger = new AuditLogger();

      // Insert test data
      logger.log({
        eventId: 'event1',
        eventKind: 1,
        eventPubkey: 'pubkey1',
        actionType: 'reply',
        actionJson: '{}',
        inputTokens: 100,
        outputTokens: 50,
        retried: false,
        rateLimited: false,
        sanitized: false,
      });

      logger.log({
        eventId: 'event2',
        eventKind: 4,
        eventPubkey: 'pubkey1',
        actionType: 'unwrap',
        actionJson: '{}',
        inputTokens: 200,
        outputTokens: 75,
        retried: true,
        rateLimited: false,
        sanitized: true,
      });

      logger.log({
        eventId: 'event3',
        eventKind: 1,
        eventPubkey: 'pubkey2',
        actionType: 'react',
        actionJson: '{}',
        inputTokens: 50,
        outputTokens: 25,
        retried: false,
        rateLimited: true,
        sanitized: false,
      });

      logger.log({
        eventId: 'event4',
        eventKind: 5005,
        eventPubkey: 'pubkey3',
        actionType: 'fulfill_job',
        actionJson: '{}',
        inputTokens: 300,
        outputTokens: 100,
        retried: false,
        rateLimited: false,
        sanitized: false,
      });
    });

    it('query() with eventId filter returns matching records', () => {
      const records = logger.query({ eventId: 'event2' });

      expect(records).toHaveLength(1);
      expect(records[0]!.eventId).toBe('event2');
      expect(records[0]!.eventKind).toBe(4);
    });

    it('query() with eventKind filter returns matching records', () => {
      const records = logger.query({ eventKind: 1 });

      expect(records).toHaveLength(2);
      expect(records.every((r) => r.eventKind === 1)).toBe(true);
    });

    it('query() with eventPubkey filter returns matching records', () => {
      const records = logger.query({ eventPubkey: 'pubkey1' });

      expect(records).toHaveLength(2);
      expect(records.every((r) => r.eventPubkey === 'pubkey1')).toBe(true);
    });

    it('query() with actionType filter returns matching records', () => {
      const records = logger.query({ actionType: 'reply' });

      expect(records).toHaveLength(1);
      expect(records[0]!.actionType).toBe('reply');
      expect(records[0]!.eventId).toBe('event1');
    });

    it('query() with since / until timestamp range returns matching records', () => {
      // Get all records to find timestamp range
      const all = logger.query({});
      const timestamps = all.map((r) => r.createdAt);
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);

      // Query with since filter
      const sinceRecords = logger.query({ since: minTime });
      expect(sinceRecords.length).toBeGreaterThanOrEqual(4);

      // Query with until filter
      const untilRecords = logger.query({ until: maxTime });
      expect(untilRecords.length).toBeGreaterThanOrEqual(4);

      // Query with both (entire range)
      const rangeRecords = logger.query({ since: minTime, until: maxTime });
      expect(rangeRecords.length).toBeGreaterThanOrEqual(4);

      // Query with narrow range (should return fewer or 0)
      const narrowRecords = logger.query({ since: maxTime + 1 });
      expect(narrowRecords).toHaveLength(0);
    });

    it('query() with limit returns at most N records', () => {
      const records = logger.query({ limit: 2 });

      expect(records).toHaveLength(2);
    });

    it('query() with no filters returns all records (up to default limit)', () => {
      const records = logger.query({});

      expect(records.length).toBeGreaterThanOrEqual(4);
    });

    it('query() with multiple filters combines them with AND', () => {
      const records = logger.query({
        eventKind: 1,
        eventPubkey: 'pubkey1',
      });

      expect(records).toHaveLength(1);
      expect(records[0]!.eventId).toBe('event1');
      expect(records[0]!.eventKind).toBe(1);
      expect(records[0]!.eventPubkey).toBe('pubkey1');
    });

    it('query() returns empty array when no matches', () => {
      const records = logger.query({ eventId: 'nonexistent' });

      expect(records).toHaveLength(0);
    });
  });

  describe('boolean fields', () => {
    beforeEach(() => {
      logger = new AuditLogger();
    });

    it('boolean fields (retried, rateLimited, sanitized) are stored and retrieved correctly', () => {
      logger.log({
        eventId: 'bool-test-1',
        eventKind: 1,
        eventPubkey: 'pubkey',
        actionType: 'reply',
        actionJson: '{}',
        inputTokens: 100,
        outputTokens: 50,
        retried: true,
        rateLimited: true,
        sanitized: true,
      });

      logger.log({
        eventId: 'bool-test-2',
        eventKind: 1,
        eventPubkey: 'pubkey',
        actionType: 'reply',
        actionJson: '{}',
        inputTokens: 100,
        outputTokens: 50,
        retried: false,
        rateLimited: false,
        sanitized: false,
      });

      const records = logger.query({});

      const record1 = records.find((r) => r.eventId === 'bool-test-1');
      expect(record1).toBeDefined();
      expect(record1!.retried).toBe(true);
      expect(record1!.rateLimited).toBe(true);
      expect(record1!.sanitized).toBe(true);

      const record2 = records.find((r) => r.eventId === 'bool-test-2');
      expect(record2).toBeDefined();
      expect(record2!.retried).toBe(false);
      expect(record2!.rateLimited).toBe(false);
      expect(record2!.sanitized).toBe(false);
    });
  });

  describe('ordering and timestamps', () => {
    beforeEach(() => {
      logger = new AuditLogger();
    });

    it('records are returned in DESC order by created_at', () => {
      // Log 3 records with slight delay
      logger.log({
        eventId: 'first',
        eventKind: 1,
        eventPubkey: 'pubkey',
        actionType: 'reply',
        actionJson: '{}',
        inputTokens: 100,
        outputTokens: 50,
        retried: false,
        rateLimited: false,
        sanitized: false,
      });

      logger.log({
        eventId: 'second',
        eventKind: 1,
        eventPubkey: 'pubkey',
        actionType: 'reply',
        actionJson: '{}',
        inputTokens: 100,
        outputTokens: 50,
        retried: false,
        rateLimited: false,
        sanitized: false,
      });

      logger.log({
        eventId: 'third',
        eventKind: 1,
        eventPubkey: 'pubkey',
        actionType: 'reply',
        actionJson: '{}',
        inputTokens: 100,
        outputTokens: 50,
        retried: false,
        rateLimited: false,
        sanitized: false,
      });

      const records = logger.query({});

      // Most recent should be first (DESC order)
      expect(records[0]!.eventId).toBe('third');
      expect(records[1]!.eventId).toBe('second');
      expect(records[2]!.eventId).toBe('first');
    });

    it('createdAt is automatically set to current Unix timestamp', () => {
      const beforeLog = Math.floor(Date.now() / 1000);

      logger.log({
        eventId: 'timestamp-test',
        eventKind: 1,
        eventPubkey: 'pubkey',
        actionType: 'reply',
        actionJson: '{}',
        inputTokens: 100,
        outputTokens: 50,
        retried: false,
        rateLimited: false,
        sanitized: false,
      });

      const afterLog = Math.floor(Date.now() / 1000);

      const records = logger.query({ eventId: 'timestamp-test' });
      expect(records).toHaveLength(1);
      expect(records[0]!.createdAt).toBeGreaterThanOrEqual(beforeLog);
      expect(records[0]!.createdAt).toBeLessThanOrEqual(afterLog);
    });
  });

  describe('database lifecycle', () => {
    it('close() closes the database without error', () => {
      logger = new AuditLogger();

      logger.log({
        eventId: 'close-test',
        eventKind: 1,
        eventPubkey: 'pubkey',
        actionType: 'reply',
        actionJson: '{}',
        inputTokens: 100,
        outputTokens: 50,
        retried: false,
        rateLimited: false,
        sanitized: false,
      });

      expect(() => {
        logger.close();
      }).not.toThrow();
    });

    it('supports :memory: mode for tests', () => {
      logger = new AuditLogger({ dbPath: ':memory:' });

      logger.log({
        eventId: 'memory-test',
        eventKind: 1,
        eventPubkey: 'pubkey',
        actionType: 'reply',
        actionJson: '{}',
        inputTokens: 100,
        outputTokens: 50,
        retried: false,
        rateLimited: false,
        sanitized: false,
      });

      const records = logger.query({ eventId: 'memory-test' });
      expect(records).toHaveLength(1);
    });
  });

  describe('default limit behavior', () => {
    beforeEach(() => {
      logger = new AuditLogger();
    });

    it('default limit is 100', () => {
      // Log 150 records
      for (let i = 0; i < 150; i++) {
        logger.log({
          eventId: `event-${i}`,
          eventKind: 1,
          eventPubkey: 'pubkey',
          actionType: 'reply',
          actionJson: '{}',
          inputTokens: 100,
          outputTokens: 50,
          retried: false,
          rateLimited: false,
          sanitized: false,
        });
      }

      const records = logger.query({});

      // Should return default limit of 100
      expect(records).toHaveLength(100);
    });

    it('explicit limit overrides default', () => {
      // Log 20 records
      for (let i = 0; i < 20; i++) {
        logger.log({
          eventId: `event-${i}`,
          eventKind: 1,
          eventPubkey: 'pubkey',
          actionType: 'reply',
          actionJson: '{}',
          inputTokens: 100,
          outputTokens: 50,
          retried: false,
          rateLimited: false,
          sanitized: false,
        });
      }

      const records = logger.query({ limit: 5 });

      expect(records).toHaveLength(5);
    });
  });
});
