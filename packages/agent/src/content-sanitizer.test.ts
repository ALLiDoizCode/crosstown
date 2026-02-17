import { describe, it, expect } from 'vitest';
import { sanitizeActionContent, sanitizeActionsResponse } from './content-sanitizer.js';
import type { Action } from './schemas/actions.js';

describe('sanitizeActionContent', () => {
  describe('control character stripping', () => {
    it('action without control characters passes through unchanged, sanitized: false', () => {
      const action: Action = {
        action: 'reply',
        content: 'Hello, world!',
        reply_to: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(false);
      expect(result.action).toEqual(action);
      expect((result.action as typeof action).content).toBe('Hello, world!');
    });

    it('action with control characters has them stripped, sanitized: true', () => {
      const action: Action = {
        action: 'reply',
        content: 'Hello\x00\x01\x1FWorld',
        reply_to: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).content).toBe('HelloWorld');
    });

    it('newlines and carriage returns are preserved (not stripped)', () => {
      const action: Action = {
        action: 'reply',
        content: 'Line 1\nLine 2\r\nLine 3',
        reply_to: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(false);
      expect((result.action as typeof action).content).toBe('Line 1\nLine 2\r\nLine 3');
    });

    it('strips control chars but preserves newlines in same string', () => {
      const action: Action = {
        action: 'fulfill_job',
        job_id: '0'.repeat(64),
        result_content: 'Result\x00Line1\nLine2\x1FEnd',
        result_kind: 6000,
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).result_content).toBe('ResultLine1\nLine2End');
    });
  });

  describe('max length truncation', () => {
    it('content exceeding max length is truncated, sanitized: true', () => {
      const longContent = 'a'.repeat(5000);
      const action: Action = {
        action: 'reply',
        content: longContent,
        reply_to: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action, { maxContentLength: 4096 });

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).content).toHaveLength(4096);
      expect((result.action as typeof action).content).toBe('a'.repeat(4096));
    });

    it('content at or below max length is not truncated', () => {
      const action: Action = {
        action: 'reply',
        content: 'a'.repeat(4096),
        reply_to: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action, { maxContentLength: 4096 });

      expect(result.sanitized).toBe(false);
      expect((result.action as typeof action).content).toHaveLength(4096);
    });

    it('custom max length config is respected', () => {
      const action: Action = {
        action: 'reply',
        content: 'a'.repeat(200),
        reply_to: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action, { maxContentLength: 100 });

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).content).toHaveLength(100);
    });

    it('truncates result_content in fulfill_job action', () => {
      const action: Action = {
        action: 'fulfill_job',
        job_id: '0'.repeat(64),
        result_content: 'x'.repeat(5000),
        result_kind: 6000,
      };

      const result = sanitizeActionContent(action, { maxContentLength: 100 });

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).result_content).toHaveLength(100);
    });

    it('truncates note in unwrap action', () => {
      const action: Action = {
        action: 'unwrap',
        event_id: '0'.repeat(64),
        note: 'z'.repeat(5000),
      };

      const result = sanitizeActionContent(action, { maxContentLength: 100 });

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).note).toHaveLength(100);
    });

    it('truncates note in store action', () => {
      const action: Action = {
        action: 'store',
        event_id: '0'.repeat(64),
        note: 'y'.repeat(5000),
      };

      const result = sanitizeActionContent(action, { maxContentLength: 100 });

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).note).toHaveLength(100);
    });

    it('does not truncate comment in zap action', () => {
      // Per spec, only content/result_content/note are truncated
      const action: Action = {
        action: 'zap',
        event_id: '0'.repeat(64),
        amount_msats: 1000,
        comment: 'c'.repeat(5000),
      };

      const result = sanitizeActionContent(action, { maxContentLength: 100 });

      expect(result.sanitized).toBe(false);
      expect((result.action as typeof action).comment).toHaveLength(5000);
    });

    it('does not truncate reason in ignore action', () => {
      // Per spec, only content/result_content/note are truncated
      const action: Action = {
        action: 'ignore',
        reason: 'r'.repeat(5000),
      };

      const result = sanitizeActionContent(action, { maxContentLength: 100 });

      expect(result.sanitized).toBe(false);
      expect((result.action as typeof action).reason).toHaveLength(5000);
    });
  });

  describe('action type coverage', () => {
    it('sanitizes reply action content field', () => {
      const action: Action = {
        action: 'reply',
        content: 'Hello\x00',
        reply_to: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).content).toBe('Hello');
    });

    it('sanitizes react action emoji field', () => {
      const action: Action = {
        action: 'react',
        emoji: '👍\x00',
        event_id: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).emoji).toBe('👍');
    });

    it('handles repost action without string content', () => {
      const action: Action = {
        action: 'repost',
        event_id: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(false);
      expect(result.action).toEqual(action);
    });

    it('sanitizes zap action optional comment field', () => {
      const action: Action = {
        action: 'zap',
        event_id: '0'.repeat(64),
        amount_msats: 1000,
        comment: 'Thanks!\x00',
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).comment).toBe('Thanks!');
    });

    it('handles zap action without comment', () => {
      const action: Action = {
        action: 'zap',
        event_id: '0'.repeat(64),
        amount_msats: 1000,
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(false);
      expect(result.action).toEqual(action);
    });

    it('sanitizes unwrap action optional note field', () => {
      const action: Action = {
        action: 'unwrap',
        event_id: '0'.repeat(64),
        note: 'Unwrapped\x00',
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).note).toBe('Unwrapped');
    });

    it('handles unwrap action without note', () => {
      const action: Action = {
        action: 'unwrap',
        event_id: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(false);
      expect(result.action).toEqual(action);
    });

    it('sanitizes fulfill_job action result_content field', () => {
      const action: Action = {
        action: 'fulfill_job',
        job_id: '0'.repeat(64),
        result_content: 'Job done\x00',
        result_kind: 6000,
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).result_content).toBe('Job done');
    });

    it('sanitizes publish_job_feedback action content field', () => {
      const action: Action = {
        action: 'publish_job_feedback',
        job_id: '0'.repeat(64),
        status: 'processing',
        content: 'Processing...\x00',
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).content).toBe('Processing...');
    });

    it('sanitizes store action optional note field', () => {
      const action: Action = {
        action: 'store',
        event_id: '0'.repeat(64),
        note: 'Stored\x00',
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).note).toBe('Stored');
    });

    it('handles store action without note', () => {
      const action: Action = {
        action: 'store',
        event_id: '0'.repeat(64),
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(false);
      expect(result.action).toEqual(action);
    });

    it('sanitizes forward action destination field', () => {
      const action: Action = {
        action: 'forward',
        event_id: '0'.repeat(64),
        destination: 'g.alice.example\x00',
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).destination).toBe('g.alice.example');
    });

    it('sanitizes ignore action reason field', () => {
      const action: Action = {
        action: 'ignore',
        reason: 'Spam detected\x00',
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).reason).toBe('Spam detected');
    });

    it('sanitizes escalate action reason field', () => {
      const action: Action = {
        action: 'escalate',
        event_id: '0'.repeat(64),
        reason: 'Needs review\x00',
      };

      const result = sanitizeActionContent(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).reason).toBe('Needs review');
    });
  });

  describe('sanitizeActionsResponse', () => {
    it('handles single action', () => {
      const action: Action = {
        action: 'reply',
        content: 'Hello\x00',
        reply_to: '0'.repeat(64),
      };

      const result = sanitizeActionsResponse(action);

      expect(result.sanitized).toBe(true);
      expect((result.action as typeof action).content).toBe('Hello');
    });

    it('handles array of actions, returns sanitized: true if any was modified', () => {
      const actions: Action[] = [
        {
          action: 'reply',
          content: 'Clean',
          reply_to: '0'.repeat(64),
        },
        {
          action: 'react',
          emoji: 'Dirty\x00',
          event_id: '0'.repeat(64),
        },
        {
          action: 'ignore',
          reason: 'Also clean',
        },
      ];

      const result = sanitizeActionsResponse(actions);

      expect(result.sanitized).toBe(true);
      expect(Array.isArray(result.action)).toBe(true);
      const resultActions = result.action as Action[];
      expect(resultActions).toHaveLength(3);
      expect((resultActions[0] as Extract<Action, { action: 'reply' }>).content).toBe('Clean');
      expect((resultActions[1] as Extract<Action, { action: 'react' }>).emoji).toBe('Dirty');
      expect((resultActions[2] as Extract<Action, { action: 'ignore' }>).reason).toBe(
        'Also clean'
      );
    });

    it('handles array of actions, returns sanitized: false if none modified', () => {
      const actions: Action[] = [
        {
          action: 'reply',
          content: 'Clean',
          reply_to: '0'.repeat(64),
        },
        {
          action: 'ignore',
          reason: 'Also clean',
        },
      ];

      const result = sanitizeActionsResponse(actions);

      expect(result.sanitized).toBe(false);
      expect(result.action).toEqual(actions);
    });

    it('applies config to all actions in array', () => {
      const actions: Action[] = [
        {
          action: 'reply',
          content: 'a'.repeat(200),
          reply_to: '0'.repeat(64),
        },
        {
          action: 'publish_job_feedback',
          job_id: '0'.repeat(64),
          status: 'success',
          content: 'b'.repeat(200),
        },
      ];

      const result = sanitizeActionsResponse(actions, { maxContentLength: 100 });

      expect(result.sanitized).toBe(true);
      const resultActions = result.action as Action[];
      expect((resultActions[0] as Extract<Action, { action: 'reply' }>).content).toHaveLength(100);
      expect(
        (resultActions[1] as Extract<Action, { action: 'publish_job_feedback' }>).content
      ).toHaveLength(100);
    });
  });
});
