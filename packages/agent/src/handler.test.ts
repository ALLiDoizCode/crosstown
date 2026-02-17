import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';
import { NoOutputGeneratedError } from 'ai';
import { handleNostrEvent } from './handler.js';
import type { HandleNostrEventConfig } from './handler.js';
import { KindRegistry } from './kind-registry.js';
import { HandlerLoader } from './handler-loader.js';
import type { NostrEvent } from 'nostr-tools/pure';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';

const mockReadFile = vi.mocked(readFile);

const HANDLER_CONTENT = '# Kind 1 Handler\nYou are a social agent. Analyze the event and decide.';
const GIFT_WRAP_HANDLER = '# Kind 1059 Handler\nYou handle encrypted gift-wrapped events.';
const DVM_HANDLER = '# Kind 5xxx Handler\nYou handle DVM job requests.';

function makeEvent(overrides: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: 'a'.repeat(64),
    pubkey: 'b'.repeat(64),
    created_at: 1700000000,
    kind: 1,
    tags: [],
    content: 'Hello world',
    sig: 'c'.repeat(128),
    ...overrides,
  };
}

function makeMockResult(actionJson: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(actionJson) }],
    finishReason: { unified: 'stop' as const, raw: undefined },
    usage: {
      inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 20, text: 20, reasoning: undefined },
    },
    warnings: [] as never[],
  };
}

function makeConfig(
  doGenerate: (() => Promise<ReturnType<typeof makeMockResult>>) | ReturnType<typeof vi.fn>,
): HandleNostrEventConfig {
  const model = new MockLanguageModelV3({ doGenerate: doGenerate as MockLanguageModelV3['doGenerate'] });
  const kindRegistry = new KindRegistry('/test/handlers');
  const handlerLoader = new HandlerLoader();
  return { model, kindRegistry, handlerLoader };
}

describe('handleNostrEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes kind:1 event and returns validated reply action', async () => {
    const action = { action: 'reply', content: 'Hello!', reply_to: 'a'.repeat(64) };
    const config = makeConfig(async () => makeMockResult(action));
    mockReadFile.mockResolvedValueOnce(HANDLER_CONTENT);

    const event = makeEvent({ kind: 1 });
    const result = await handleNostrEvent(event, config);

    expect(result.actions).toEqual(action);
    expect(result.retried).toBe(false);
    expect(result.usage).toBeDefined();
    expect(result.usage!.inputTokens).toBeTypeOf('number');
    expect(result.usage!.outputTokens).toBeTypeOf('number');
  });

  it('processes kind:1059 event and returns validated unwrap action', async () => {
    const action = { action: 'unwrap', event_id: 'a'.repeat(64), note: 'Processing gift wrap' };
    const config = makeConfig(async () => makeMockResult(action));
    mockReadFile.mockResolvedValueOnce(GIFT_WRAP_HANDLER);

    const event = makeEvent({ kind: 1059 });
    const result = await handleNostrEvent(event, config);

    expect(result.actions).toEqual(action);
    expect(result.retried).toBe(false);
  });

  it('processes kind:5001 event and returns validated multi-action response', async () => {
    const actions = [
      { action: 'publish_job_feedback', job_id: 'a'.repeat(64), status: 'processing', content: 'Working on it' },
      { action: 'fulfill_job', job_id: 'a'.repeat(64), result_content: 'Done', result_kind: 6001 },
    ];
    const config = makeConfig(async () => makeMockResult(actions));
    mockReadFile.mockResolvedValueOnce(DVM_HANDLER);

    const event = makeEvent({ kind: 5001 });
    const result = await handleNostrEvent(event, config);

    expect(result.actions).toEqual(actions);
    expect(result.retried).toBe(false);
  });

  it('returns ignore for unhandled kind without calling LLM', async () => {
    const doGenerate = vi.fn();
    const config = makeConfig(doGenerate);

    const event = makeEvent({ kind: 9999 });
    const result = await handleNostrEvent(event, config);

    expect(result.actions).toEqual({ action: 'ignore', reason: 'No handler for kind 9999' });
    expect(result.retried).toBe(false);
    expect(doGenerate).not.toHaveBeenCalled();
  });

  it('applies content isolation with <untrusted-content> tags and ^ markers', async () => {
    const action = { action: 'reply', content: 'Response', reply_to: 'a'.repeat(64) };
    const doGenerate = vi.fn(async () => makeMockResult(action));
    const config = makeConfig(doGenerate);
    mockReadFile.mockResolvedValueOnce(HANDLER_CONTENT);

    const event = makeEvent({ kind: 1, content: 'Test content\nSecond line' });
    await handleNostrEvent(event, config);

    expect(doGenerate).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (doGenerate as any).mock.calls[0][0];
    const promptParts = callArgs.prompt;
    // Find user message in prompt
    const userMsg = promptParts.find(
      (p: { role: string }) => p.role === 'user',
    );
    expect(userMsg).toBeDefined();

    // The user message content contains the prompt text
    const textContent = userMsg.content.find(
      (c: { type: string }) => c.type === 'text',
    );
    expect(textContent.text).toContain('<untrusted-content>');
    expect(textContent.text).toContain('^Test content');
    expect(textContent.text).toContain('^Second line');
    expect(textContent.text).toContain('</untrusted-content>');
  });

  it('returns escalation when action violates allowlist', async () => {
    // kind:1 (social) does NOT allow 'unwrap'
    const action = { action: 'unwrap', event_id: 'a'.repeat(64) };
    const config = makeConfig(async () => makeMockResult(action));
    mockReadFile.mockResolvedValueOnce(HANDLER_CONTENT);

    const event = makeEvent({ kind: 1 });
    const result = await handleNostrEvent(event, config);

    expect(result.actions).toEqual({
      action: 'escalate',
      reason: "Action 'unwrap' not allowed for kind 1",
      event_id: 'a'.repeat(64),
    });
    expect(result.retried).toBe(false);
  });

  it('retries on NoOutputGeneratedError and succeeds', async () => {
    const action = { action: 'reply', content: 'After retry', reply_to: 'a'.repeat(64) };
    let callCount = 0;
    const doGenerate = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new NoOutputGeneratedError({ message: 'No valid output' });
      }
      return makeMockResult(action);
    });
    const config = makeConfig(doGenerate);
    mockReadFile.mockResolvedValueOnce(HANDLER_CONTENT);

    const event = makeEvent({ kind: 1 });
    const result = await handleNostrEvent(event, config);

    expect(result.actions).toEqual(action);
    expect(result.retried).toBe(true);
    expect(doGenerate).toHaveBeenCalledTimes(2);
  });

  it('returns escalation when both attempts throw NoOutputGeneratedError', async () => {
    const doGenerate = vi.fn(async () => {
      throw new NoOutputGeneratedError({ message: 'No valid output' });
    });
    const config = makeConfig(doGenerate);
    mockReadFile.mockResolvedValueOnce(HANDLER_CONTENT);

    const event = makeEvent({ kind: 1 });
    const result = await handleNostrEvent(event, config);

    expect(result.actions).toEqual({
      action: 'escalate',
      reason: 'Failed to generate valid action after retry',
      event_id: 'a'.repeat(64),
    });
    expect(result.retried).toBe(true);
    expect(doGenerate).toHaveBeenCalledTimes(2);
  });

  it('uses handler markdown as system prompt', async () => {
    const action = { action: 'reply', content: 'Hi', reply_to: 'a'.repeat(64) };
    const doGenerate = vi.fn(async () => makeMockResult(action));
    const config = makeConfig(doGenerate);
    mockReadFile.mockResolvedValueOnce(HANDLER_CONTENT);

    const event = makeEvent({ kind: 1 });
    await handleNostrEvent(event, config);

    expect(doGenerate).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (doGenerate as any).mock.calls[0][0];
    const systemMsg = callArgs.prompt.find(
      (p: { role: string }) => p.role === 'system',
    );
    expect(systemMsg).toBeDefined();
    expect(systemMsg.content).toContain(HANDLER_CONTENT);
  });

  it('re-throws non-NoOutputGeneratedError errors', async () => {
    const doGenerate = vi.fn(async () => {
      throw new Error('Network failure');
    });
    const config = makeConfig(doGenerate);
    mockReadFile.mockResolvedValueOnce(HANDLER_CONTENT);

    const event = makeEvent({ kind: 1 });
    await expect(handleNostrEvent(event, config)).rejects.toThrow('Network failure');
  });
});
