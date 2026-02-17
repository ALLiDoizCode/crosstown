import { describe, it, expect } from 'vitest';
import {
  ReplyActionSchema,
  ReactActionSchema,
  RepostActionSchema,
  ZapActionSchema,
  UnwrapActionSchema,
  FulfillJobActionSchema,
  PublishJobFeedbackActionSchema,
  StoreActionSchema,
  ForwardActionSchema,
  IgnoreActionSchema,
  EscalateActionSchema,
  ActionSchema,
  ActionsResponseSchema,
} from './actions.js';

const validHex = 'a'.repeat(64);

describe('Individual Action Schemas', () => {
  describe('ReplyActionSchema', () => {
    it('validates correct input', () => {
      const result = ReplyActionSchema.safeParse({
        action: 'reply',
        content: 'Hello!',
        reply_to: validHex,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing content', () => {
      const result = ReplyActionSchema.safeParse({ action: 'reply', reply_to: validHex });
      expect(result.success).toBe(false);
    });

    it('rejects empty content', () => {
      const result = ReplyActionSchema.safeParse({
        action: 'reply',
        content: '',
        reply_to: validHex,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ReactActionSchema', () => {
    it('validates correct input', () => {
      const result = ReactActionSchema.safeParse({
        action: 'react',
        emoji: '👍',
        event_id: validHex,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing emoji', () => {
      const result = ReactActionSchema.safeParse({ action: 'react', event_id: validHex });
      expect(result.success).toBe(false);
    });
  });

  describe('RepostActionSchema', () => {
    it('validates correct input', () => {
      const result = RepostActionSchema.safeParse({
        action: 'repost',
        event_id: validHex,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing event_id', () => {
      const result = RepostActionSchema.safeParse({ action: 'repost' });
      expect(result.success).toBe(false);
    });
  });

  describe('ZapActionSchema', () => {
    it('validates correct input', () => {
      const result = ZapActionSchema.safeParse({
        action: 'zap',
        amount_msats: 1000,
        event_id: validHex,
      });
      expect(result.success).toBe(true);
    });

    it('validates with optional comment', () => {
      const result = ZapActionSchema.safeParse({
        action: 'zap',
        amount_msats: 1000,
        event_id: validHex,
        comment: 'Nice!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative amount_msats', () => {
      const result = ZapActionSchema.safeParse({
        action: 'zap',
        amount_msats: -1,
        event_id: validHex,
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero amount_msats', () => {
      const result = ZapActionSchema.safeParse({
        action: 'zap',
        amount_msats: 0,
        event_id: validHex,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer amount_msats', () => {
      const result = ZapActionSchema.safeParse({
        action: 'zap',
        amount_msats: 10.5,
        event_id: validHex,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('UnwrapActionSchema', () => {
    it('validates correct input', () => {
      const result = UnwrapActionSchema.safeParse({
        action: 'unwrap',
        event_id: validHex,
      });
      expect(result.success).toBe(true);
    });

    it('validates with optional note', () => {
      const result = UnwrapActionSchema.safeParse({
        action: 'unwrap',
        event_id: validHex,
        note: 'gift wrap detected',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('FulfillJobActionSchema', () => {
    it('validates correct input', () => {
      const result = FulfillJobActionSchema.safeParse({
        action: 'fulfill_job',
        job_id: validHex,
        result_content: 'Job result here',
        result_kind: 6001,
      });
      expect(result.success).toBe(true);
    });

    it('rejects result_kind below 6000', () => {
      const result = FulfillJobActionSchema.safeParse({
        action: 'fulfill_job',
        job_id: validHex,
        result_content: 'result',
        result_kind: 5999,
      });
      expect(result.success).toBe(false);
    });

    it('rejects result_kind above 6999', () => {
      const result = FulfillJobActionSchema.safeParse({
        action: 'fulfill_job',
        job_id: validHex,
        result_content: 'result',
        result_kind: 7000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PublishJobFeedbackActionSchema', () => {
    it('validates correct input', () => {
      const result = PublishJobFeedbackActionSchema.safeParse({
        action: 'publish_job_feedback',
        job_id: validHex,
        status: 'processing',
        content: 'Working on it...',
      });
      expect(result.success).toBe(true);
    });

    it('validates all status values', () => {
      for (const status of ['processing', 'success', 'error', 'partial']) {
        const result = PublishJobFeedbackActionSchema.safeParse({
          action: 'publish_job_feedback',
          job_id: validHex,
          status,
          content: 'feedback',
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid status', () => {
      const result = PublishJobFeedbackActionSchema.safeParse({
        action: 'publish_job_feedback',
        job_id: validHex,
        status: 'unknown_status',
        content: 'feedback',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('StoreActionSchema', () => {
    it('validates correct input', () => {
      const result = StoreActionSchema.safeParse({
        action: 'store',
        event_id: validHex,
      });
      expect(result.success).toBe(true);
    });

    it('validates with optional note', () => {
      const result = StoreActionSchema.safeParse({
        action: 'store',
        event_id: validHex,
        note: 'stored for later',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ForwardActionSchema', () => {
    it('validates correct input', () => {
      const result = ForwardActionSchema.safeParse({
        action: 'forward',
        event_id: validHex,
        destination: 'wss://relay.example.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty destination', () => {
      const result = ForwardActionSchema.safeParse({
        action: 'forward',
        event_id: validHex,
        destination: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('IgnoreActionSchema', () => {
    it('validates correct input', () => {
      const result = IgnoreActionSchema.safeParse({
        action: 'ignore',
        reason: 'Not relevant',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty reason', () => {
      const result = IgnoreActionSchema.safeParse({ action: 'ignore', reason: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('EscalateActionSchema', () => {
    it('validates correct input', () => {
      const result = EscalateActionSchema.safeParse({
        action: 'escalate',
        reason: 'Suspicious content',
        event_id: validHex,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing event_id', () => {
      const result = EscalateActionSchema.safeParse({
        action: 'escalate',
        reason: 'alert',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Hex ID validation', () => {
  it('rejects non-hex characters', () => {
    const result = ReplyActionSchema.safeParse({
      action: 'reply',
      content: 'test',
      reply_to: 'g'.repeat(64),
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong length (63 chars)', () => {
    const result = ReplyActionSchema.safeParse({
      action: 'reply',
      content: 'test',
      reply_to: 'a'.repeat(63),
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong length (65 chars)', () => {
    const result = ReplyActionSchema.safeParse({
      action: 'reply',
      content: 'test',
      reply_to: 'a'.repeat(65),
    });
    expect(result.success).toBe(false);
  });

  it('rejects uppercase hex', () => {
    const result = ReplyActionSchema.safeParse({
      action: 'reply',
      content: 'test',
      reply_to: 'A'.repeat(64),
    });
    expect(result.success).toBe(false);
  });
});

describe('ActionSchema — discriminated union', () => {
  it('validates any valid action', () => {
    const actions = [
      { action: 'reply', content: 'hi', reply_to: validHex },
      { action: 'react', emoji: '👍', event_id: validHex },
      { action: 'repost', event_id: validHex },
      { action: 'ignore', reason: 'spam' },
    ];
    for (const a of actions) {
      expect(ActionSchema.safeParse(a).success).toBe(true);
    }
  });

  it('rejects unknown action types', () => {
    const result = ActionSchema.safeParse({ action: 'dance', event_id: validHex });
    expect(result.success).toBe(false);
  });
});

describe('ActionsResponseSchema', () => {
  it('validates a single action', () => {
    const result = ActionsResponseSchema.safeParse({
      action: 'ignore',
      reason: 'not relevant',
    });
    expect(result.success).toBe(true);
  });

  it('validates an array of 1 action', () => {
    const result = ActionsResponseSchema.safeParse([
      { action: 'ignore', reason: 'spam' },
    ]);
    expect(result.success).toBe(true);
  });

  it('validates an array of 5 actions', () => {
    const actions = Array.from({ length: 5 }, () => ({
      action: 'ignore' as const,
      reason: 'test',
    }));
    const result = ActionsResponseSchema.safeParse(actions);
    expect(result.success).toBe(true);
  });

  it('rejects an empty array', () => {
    const result = ActionsResponseSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it('rejects an array with >5 actions', () => {
    const actions = Array.from({ length: 6 }, () => ({
      action: 'ignore' as const,
      reason: 'test',
    }));
    const result = ActionsResponseSchema.safeParse(actions);
    expect(result.success).toBe(false);
  });
});
