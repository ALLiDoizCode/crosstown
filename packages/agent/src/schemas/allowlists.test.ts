import { describe, it, expect } from 'vitest';
import { getKindCategory, validateActionForKind } from './allowlists.js';

describe('getKindCategory()', () => {
  it('categorizes kind 1 as social', () => {
    expect(getKindCategory(1)).toBe('social');
  });

  it('categorizes kind 30023 as social', () => {
    expect(getKindCategory(30023)).toBe('social');
  });

  it('categorizes kind 6 as repost', () => {
    expect(getKindCategory(6)).toBe('repost');
  });

  it('categorizes kind 7 as reaction', () => {
    expect(getKindCategory(7)).toBe('reaction');
  });

  it('categorizes kind 1059 as gift_wrap', () => {
    expect(getKindCategory(1059)).toBe('gift_wrap');
  });

  it('categorizes kind 5001 as dvm_request', () => {
    expect(getKindCategory(5001)).toBe('dvm_request');
  });

  it('categorizes kind 5000 as dvm_request', () => {
    expect(getKindCategory(5000)).toBe('dvm_request');
  });

  it('categorizes kind 5999 as dvm_request', () => {
    expect(getKindCategory(5999)).toBe('dvm_request');
  });

  it('categorizes kind 6001 as dvm_result', () => {
    expect(getKindCategory(6001)).toBe('dvm_result');
  });

  it('categorizes kind 7000 as dvm_feedback', () => {
    expect(getKindCategory(7000)).toBe('dvm_feedback');
  });

  it('categorizes kind 10032 as ilp_peer_info', () => {
    expect(getKindCategory(10032)).toBe('ilp_peer_info');
  });

  it('categorizes kind 23194 as spsp_request', () => {
    expect(getKindCategory(23194)).toBe('spsp_request');
  });

  it('categorizes kind 23195 as spsp_response', () => {
    expect(getKindCategory(23195)).toBe('spsp_response');
  });

  it('categorizes kind 99999 as unknown', () => {
    expect(getKindCategory(99999)).toBe('unknown');
  });

  it('categorizes kind 0 as unknown', () => {
    expect(getKindCategory(0)).toBe('unknown');
  });
});

describe('validateActionForKind()', () => {
  it('allows reply for kind 1 (social)', () => {
    const result = validateActionForKind({ action: 'reply' }, 1);
    expect(result.valid).toBe(true);
  });

  it('rejects reply for kind 1059 (gift_wrap)', () => {
    const result = validateActionForKind({ action: 'reply' }, 1059);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain('reply');
    expect(result.reason).toContain('gift_wrap');
  });

  it('allows unwrap for kind 1059', () => {
    const result = validateActionForKind({ action: 'unwrap' }, 1059);
    expect(result.valid).toBe(true);
  });

  it('allows fulfill_job for kind 5001', () => {
    const result = validateActionForKind({ action: 'fulfill_job' }, 5001);
    expect(result.valid).toBe(true);
  });

  it('rejects zap for kind 5001', () => {
    const result = validateActionForKind({ action: 'zap' }, 5001);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('zap');
  });

  it('allows ignore for all kind categories (universal action)', () => {
    const kinds = [1, 6, 7, 1059, 5001, 6001, 7000, 10032, 23194, 23195, 99999];
    for (const kind of kinds) {
      const result = validateActionForKind({ action: 'ignore' }, kind);
      expect(result.valid).toBe(true);
    }
  });

  it('allows escalate for all kind categories (universal action)', () => {
    const kinds = [1, 6, 7, 1059, 5001, 6001, 7000, 10032, 23194, 23195, 99999];
    for (const kind of kinds) {
      const result = validateActionForKind({ action: 'escalate' }, kind);
      expect(result.valid).toBe(true);
    }
  });

  it('allows store for ilp_peer_info (kind 10032)', () => {
    const result = validateActionForKind({ action: 'store' }, 10032);
    expect(result.valid).toBe(true);
  });

  it('allows forward for spsp_request (kind 23194)', () => {
    const result = validateActionForKind({ action: 'forward' }, 23194);
    expect(result.valid).toBe(true);
  });

  it('rejects forward for spsp_response (kind 23195)', () => {
    const result = validateActionForKind({ action: 'forward' }, 23195);
    expect(result.valid).toBe(false);
  });
});
