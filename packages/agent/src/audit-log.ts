import Database from 'better-sqlite3';

/**
 * Entry to be logged in the audit trail
 */
export interface AuditEntry {
  /** Nostr event ID (hex) */
  eventId: string;
  /** Nostr event kind */
  eventKind: number;
  /** Nostr event author pubkey (hex) */
  eventPubkey: string;
  /** Action type chosen by the handler */
  actionType: string;
  /** Full action JSON */
  actionJson: string;
  /** Input tokens consumed */
  inputTokens: number;
  /** Output tokens generated */
  outputTokens: number;
  /** Whether the handler was retried */
  retried: boolean;
  /** Whether the action was rate limited */
  rateLimited: boolean;
  /** Whether the action content was sanitized */
  sanitized: boolean;
}

/**
 * Audit record retrieved from the database (includes id and createdAt)
 */
export interface AuditRecord extends AuditEntry {
  /** Auto-increment ID */
  id: number;
  /** Unix timestamp (seconds) when the entry was logged */
  createdAt: number;
}

/**
 * Filters for querying audit records
 */
export interface AuditQueryFilters {
  /** Filter by event ID */
  eventId?: string;
  /** Filter by event kind */
  eventKind?: number;
  /** Filter by event author pubkey */
  eventPubkey?: string;
  /** Filter by action type */
  actionType?: string;
  /** Filter by timestamp >= since (Unix timestamp in seconds) */
  since?: number;
  /** Filter by timestamp <= until (Unix timestamp in seconds) */
  until?: number;
  /** Maximum number of records to return (default: 100) */
  limit?: number;
}

/**
 * Audit logger for recording every action decision to SQLite.
 *
 * Records event metadata, chosen action, token usage, and security flags
 * (retried, rate limited, sanitized) for each handler invocation.
 *
 * Supports querying by event ID, kind, pubkey, action type, and timestamp range.
 *
 * @example
 * ```ts
 * const logger = new AuditLogger({ dbPath: './audit.db' });
 * logger.log({
 *   eventId: 'abc123...',
 *   eventKind: 1,
 *   eventPubkey: 'def456...',
 *   actionType: 'reply',
 *   actionJson: JSON.stringify(action),
 *   inputTokens: 150,
 *   outputTokens: 50,
 *   retried: false,
 *   rateLimited: false,
 *   sanitized: true,
 * });
 * const records = logger.query({ eventKind: 1, limit: 10 });
 * ```
 */
export class AuditLogger {
  private db: Database.Database;
  private logStmt: Database.Statement;

  constructor(config: { dbPath?: string } = {}) {
    const { dbPath = ':memory:' } = config;

    this.db = new Database(dbPath);

    // Create schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        event_kind INTEGER NOT NULL,
        event_pubkey TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_json TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        retried INTEGER NOT NULL DEFAULT 0,
        rate_limited INTEGER NOT NULL DEFAULT 0,
        sanitized INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_event_id ON audit_log(event_id);
      CREATE INDEX IF NOT EXISTS idx_audit_pubkey ON audit_log(event_pubkey);
      CREATE INDEX IF NOT EXISTS idx_audit_kind ON audit_log(event_kind);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);
    `);

    // Prepare statement for hot-path insert
    this.logStmt = this.db.prepare(`
      INSERT INTO audit_log (
        event_id, event_kind, event_pubkey, action_type, action_json,
        input_tokens, output_tokens, retried, rate_limited, sanitized, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  /**
   * Log an audit entry synchronously.
   *
   * @param entry - Audit entry to log
   */
  log(entry: AuditEntry): void {
    const now = Math.floor(Date.now() / 1000);

    this.logStmt.run(
      entry.eventId,
      entry.eventKind,
      entry.eventPubkey,
      entry.actionType,
      entry.actionJson,
      entry.inputTokens,
      entry.outputTokens,
      entry.retried ? 1 : 0,
      entry.rateLimited ? 1 : 0,
      entry.sanitized ? 1 : 0,
      now
    );
  }

  /**
   * Query audit records with filters.
   *
   * @param filters - Query filters (all conditions are AND-ed)
   * @returns Array of matching audit records
   */
  query(filters: AuditQueryFilters = {}): AuditRecord[] {
    const { eventId, eventKind, eventPubkey, actionType, since, until, limit = 100 } = filters;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (eventId !== undefined) {
      conditions.push('event_id = ?');
      params.push(eventId);
    }

    if (eventKind !== undefined) {
      conditions.push('event_kind = ?');
      params.push(eventKind);
    }

    if (eventPubkey !== undefined) {
      conditions.push('event_pubkey = ?');
      params.push(eventPubkey);
    }

    if (actionType !== undefined) {
      conditions.push('action_type = ?');
      params.push(actionType);
    }

    if (since !== undefined) {
      conditions.push('created_at >= ?');
      params.push(since);
    }

    if (until !== undefined) {
      conditions.push('created_at <= ?');
      params.push(until);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT
        id, event_id, event_kind, event_pubkey, action_type, action_json,
        input_tokens, output_tokens, retried, rate_limited, sanitized, created_at
      FROM audit_log
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `;

    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: number;
      event_id: string;
      event_kind: number;
      event_pubkey: string;
      action_type: string;
      action_json: string;
      input_tokens: number;
      output_tokens: number;
      retried: number;
      rate_limited: number;
      sanitized: number;
      created_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      eventId: row.event_id,
      eventKind: row.event_kind,
      eventPubkey: row.event_pubkey,
      actionType: row.action_type,
      actionJson: row.action_json,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      retried: row.retried === 1,
      rateLimited: row.rate_limited === 1,
      sanitized: row.sanitized === 1,
      createdAt: row.created_at,
    }));
  }

  /**
   * Close the SQLite database connection.
   */
  close(): void {
    this.db.close();
  }
}
