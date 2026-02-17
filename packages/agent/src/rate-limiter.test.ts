import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  afterEach(() => {
    if (limiter) {
      limiter.close();
    }
  });

  describe('basic rate limiting', () => {
    beforeEach(() => {
      limiter = new RateLimiter({ maxActions: 3, windowSeconds: 60 });
    });

    it('allows action when under rate limit', () => {
      const pubkey = 'abc123';
      const kind = 1;

      const result1 = limiter.checkLimit(pubkey, kind);
      expect(result1.allowed).toBe(true);
      expect(result1.reason).toBeUndefined();

      limiter.recordAction(pubkey, kind);

      const result2 = limiter.checkLimit(pubkey, kind);
      expect(result2.allowed).toBe(true);
      expect(result2.reason).toBeUndefined();
    });

    it('blocks action when rate limit reached', () => {
      const pubkey = 'def456';
      const kind = 1;

      // Record 3 actions (at limit)
      for (let i = 0; i < 3; i++) {
        const result = limiter.checkLimit(pubkey, kind);
        expect(result.allowed).toBe(true);
        limiter.recordAction(pubkey, kind);
      }

      // 4th action should be blocked
      const result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('Rate limit exceeded');
      expect(result.reason).toContain('3 actions');
      expect(result.reason).toContain('max: 3');
    });
  });

  describe('time-based sliding window', () => {
    it('rate limit resets after window expires', () => {
      let currentTime = 1000;
      const nowFn = () => currentTime;

      limiter = new RateLimiter({ maxActions: 2, windowSeconds: 60, nowFn });

      const pubkey = 'ghi789';
      const kind = 1;

      // Record 2 actions at t=1000
      limiter.recordAction(pubkey, kind);
      limiter.recordAction(pubkey, kind);

      // Should be blocked at t=1000
      let result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(false);

      // Advance time to t=1061 (past the 60s window)
      currentTime = 1061;

      // Should be allowed again (old actions expired)
      result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(true);
    });

    it('partial window reset', () => {
      let currentTime = 1000;
      const nowFn = () => currentTime;

      limiter = new RateLimiter({ maxActions: 2, windowSeconds: 60, nowFn });

      const pubkey = 'jkl012';
      const kind = 1;

      // Record 1 action at t=1000
      limiter.recordAction(pubkey, kind);

      // Advance to t=1030
      currentTime = 1030;

      // Record 1 more action (now 2 in window)
      limiter.recordAction(pubkey, kind);

      // Should be blocked at t=1030
      let result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(false);

      // Advance to t=1061 (first action expired, second still in window)
      currentTime = 1061;

      // Should be allowed (only 1 action in window now)
      result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(true);
    });
  });

  describe('isolation', () => {
    beforeEach(() => {
      limiter = new RateLimiter({ maxActions: 2, windowSeconds: 60 });
    });

    it('different pubkeys have independent rate limits', () => {
      const pubkey1 = 'pubkey1';
      const pubkey2 = 'pubkey2';
      const kind = 1;

      // Fill pubkey1's limit
      limiter.recordAction(pubkey1, kind);
      limiter.recordAction(pubkey1, kind);

      // pubkey1 should be blocked
      const result1 = limiter.checkLimit(pubkey1, kind);
      expect(result1.allowed).toBe(false);

      // pubkey2 should still be allowed
      const result2 = limiter.checkLimit(pubkey2, kind);
      expect(result2.allowed).toBe(true);
    });

    it('different kinds for same pubkey have independent rate limits', () => {
      const pubkey = 'pubkey123';
      const kind1 = 1;
      const kind2 = 4;

      // Fill kind1's limit
      limiter.recordAction(pubkey, kind1);
      limiter.recordAction(pubkey, kind1);

      // kind1 should be blocked
      const result1 = limiter.checkLimit(pubkey, kind1);
      expect(result1.allowed).toBe(false);

      // kind2 should still be allowed
      const result2 = limiter.checkLimit(pubkey, kind2);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('configuration', () => {
    it('custom config overrides defaults (maxActions)', () => {
      limiter = new RateLimiter({ maxActions: 5, windowSeconds: 60 });

      const pubkey = 'custom1';
      const kind = 1;

      // Should allow 5 actions
      for (let i = 0; i < 5; i++) {
        const result = limiter.checkLimit(pubkey, kind);
        expect(result.allowed).toBe(true);
        limiter.recordAction(pubkey, kind);
      }

      // 6th should be blocked
      const result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(false);
    });

    it('custom config overrides defaults (windowSeconds)', () => {
      let currentTime = 1000;
      const nowFn = () => currentTime;

      limiter = new RateLimiter({ maxActions: 1, windowSeconds: 30, nowFn });

      const pubkey = 'custom2';
      const kind = 1;

      // Record 1 action at t=1000
      limiter.recordAction(pubkey, kind);

      // Should be blocked at t=1000
      let result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(false);

      // Advance to t=1031 (past the 30s window)
      currentTime = 1031;

      // Should be allowed again
      result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(true);
    });

    it('uses default config when not provided', () => {
      limiter = new RateLimiter();

      const pubkey = 'default-test';
      const kind = 1;

      // Default is 10 actions per 60 seconds
      for (let i = 0; i < 10; i++) {
        const result = limiter.checkLimit(pubkey, kind);
        expect(result.allowed).toBe(true);
        limiter.recordAction(pubkey, kind);
      }

      // 11th should be blocked
      const result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('cleanup() removes expired entries', () => {
      let currentTime = 1000;
      const nowFn = () => currentTime;

      limiter = new RateLimiter({ maxActions: 2, windowSeconds: 60, nowFn });

      const pubkey = 'cleanup-test';
      const kind = 1;

      // Record 2 actions at t=1000
      limiter.recordAction(pubkey, kind);
      limiter.recordAction(pubkey, kind);

      // Should be blocked
      let result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(false);

      // Advance time past window
      currentTime = 1061;

      // Before cleanup, old entries still exist in DB but don't affect limit check
      result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(true);

      // Run cleanup to remove old entries
      limiter.cleanup();

      // Should still be allowed (old entries removed)
      result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(true);

      // Record new actions to verify cleanup worked
      limiter.recordAction(pubkey, kind);
      limiter.recordAction(pubkey, kind);

      // Should be blocked again
      result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(false);
    });
  });

  describe('database lifecycle', () => {
    it('close() closes the database without error', () => {
      limiter = new RateLimiter();

      const pubkey = 'close-test';
      const kind = 1;

      limiter.recordAction(pubkey, kind);

      expect(() => {
        limiter.close();
      }).not.toThrow();
    });

    it('supports :memory: mode for tests', () => {
      limiter = new RateLimiter({ dbPath: ':memory:' });

      const pubkey = 'memory-test';
      const kind = 1;

      // Should work normally with in-memory DB
      const result = limiter.checkLimit(pubkey, kind);
      expect(result.allowed).toBe(true);

      limiter.recordAction(pubkey, kind);

      const result2 = limiter.checkLimit(pubkey, kind);
      expect(result2.allowed).toBe(true);
    });
  });
});
