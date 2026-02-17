import Database from 'better-sqlite3';

/**
 * Configuration for the RateLimiter
 */
export interface RateLimiterConfig {
  /** Database path (default: ':memory:' for in-memory) */
  dbPath?: string;
  /** Maximum actions allowed in the window (default: 10) */
  maxActions?: number;
  /** Window duration in seconds (default: 60) */
  windowSeconds?: number;
  /** Function to get current Unix timestamp (default: Date.now() / 1000) */
  nowFn?: () => number;
}

/**
 * Result from checkLimit()
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Per-pubkey, per-kind sliding window rate limiter backed by SQLite.
 *
 * Enforces rate limits by counting actions within a sliding time window.
 * Uses SQLite for persistence across restarts (or :memory: for tests).
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({ maxActions: 5, windowSeconds: 60 });
 * const result = limiter.checkLimit('pubkey-hex', 1);
 * if (result.allowed) {
 *   limiter.recordAction('pubkey-hex', 1);
 *   // ... process event
 * }
 * ```
 */
export class RateLimiter {
  private db: Database.Database;
  private maxActions: number;
  private windowSeconds: number;
  private nowFn: () => number;

  private checkLimitStmt: Database.Statement;
  private recordActionStmt: Database.Statement;
  private cleanupStmt: Database.Statement;

  constructor(config: RateLimiterConfig = {}) {
    const {
      dbPath = ':memory:',
      maxActions = 10,
      windowSeconds = 60,
      nowFn = () => Math.floor(Date.now() / 1000),
    } = config;

    this.db = new Database(dbPath);
    this.maxActions = maxActions;
    this.windowSeconds = windowSeconds;
    this.nowFn = nowFn;

    // Create schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limit_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pubkey TEXT NOT NULL,
        kind INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rate_pubkey_kind ON rate_limit_actions(pubkey, kind, created_at);
    `);

    // Prepare statements for hot-path operations
    this.checkLimitStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM rate_limit_actions
      WHERE pubkey = ? AND kind = ? AND created_at >= ?
    `);

    this.recordActionStmt = this.db.prepare(`
      INSERT INTO rate_limit_actions (pubkey, kind, created_at)
      VALUES (?, ?, ?)
    `);

    this.cleanupStmt = this.db.prepare(`
      DELETE FROM rate_limit_actions
      WHERE created_at < ?
    `);
  }

  /**
   * Check if a pubkey+kind combination is within its rate limit.
   *
   * @param pubkey - Nostr public key (hex)
   * @param kind - Nostr event kind
   * @returns Result with allowed status and optional reason
   */
  checkLimit(pubkey: string, kind: number): RateLimitCheckResult {
    const now = this.nowFn();
    const windowStart = now - this.windowSeconds;

    const result = this.checkLimitStmt.get(pubkey, kind, windowStart) as { count: number };
    const count = result.count;

    if (count >= this.maxActions) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${count} actions in last ${this.windowSeconds}s (max: ${this.maxActions})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record an action for rate tracking.
   *
   * @param pubkey - Nostr public key (hex)
   * @param kind - Nostr event kind
   */
  recordAction(pubkey: string, kind: number): void {
    const now = this.nowFn();
    this.recordActionStmt.run(pubkey, kind, now);
  }

  /**
   * Remove expired entries older than the rate limit window.
   * Should be called periodically to prevent unbounded table growth.
   */
  cleanup(): void {
    const now = this.nowFn();
    const cutoff = now - this.windowSeconds;
    this.cleanupStmt.run(cutoff);
  }

  /**
   * Close the SQLite database connection.
   */
  close(): void {
    this.db.close();
  }
}
