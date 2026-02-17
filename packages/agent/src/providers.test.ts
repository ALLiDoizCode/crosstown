import { describe, it, expect } from 'vitest';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createMoonshotAI } from '@ai-sdk/moonshotai';
import { createAgentProviderRegistry, type ProviderRegistryConfig } from './providers.js';

describe('createAgentProviderRegistry', () => {
  it('creates registry with multiple providers (Anthropic + OpenAI + Moonshot AI)', () => {
    const providers: ProviderRegistryConfig = {
      anthropic: createAnthropic({ apiKey: 'test-key' }),
      openai: createOpenAI({ apiKey: 'test-key' }),
      moonshotai: createMoonshotAI({ apiKey: 'test-key' }),
    };

    const registry = createAgentProviderRegistry(providers);
    expect(registry).toBeDefined();
    expect(typeof registry.languageModel).toBe('function');
  });

  it('creates registry with a single provider (Anthropic only)', () => {
    const providers: ProviderRegistryConfig = {
      anthropic: createAnthropic({ apiKey: 'test-key' }),
    };

    const registry = createAgentProviderRegistry(providers);
    expect(registry).toBeDefined();
    expect(typeof registry.languageModel).toBe('function');
  });

  it('creates registry with a single provider (Moonshot AI only)', () => {
    const providers: ProviderRegistryConfig = {
      moonshotai: createMoonshotAI({ apiKey: 'test-key' }),
    };

    const registry = createAgentProviderRegistry(providers);
    expect(registry).toBeDefined();
    expect(typeof registry.languageModel).toBe('function');
  });

  it('creates registry with Ollama via createOpenAI with custom baseURL', () => {
    const providers: ProviderRegistryConfig = {
      ollama: createOpenAI({
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'ollama',
      }),
    };

    const registry = createAgentProviderRegistry(providers);
    expect(registry).toBeDefined();
    expect(typeof registry.languageModel).toBe('function');
  });

  it('creates registry with Ollama using alternative baseURL', () => {
    const providers: ProviderRegistryConfig = {
      ollama: createOpenAI({
        baseURL: 'http://my-ollama-server:11434/v1',
        apiKey: 'ollama',
      }),
    };

    const registry = createAgentProviderRegistry(providers);
    expect(registry).toBeDefined();
    expect(typeof registry.languageModel).toBe('function');
  });

  it('creates registry with empty providers map', () => {
    const registry = createAgentProviderRegistry({});
    expect(registry).toBeDefined();
    expect(typeof registry.languageModel).toBe('function');
  });

  it('resolves a model by string identifier for registered provider', () => {
    const providers: ProviderRegistryConfig = {
      anthropic: createAnthropic({ apiKey: 'test-key' }),
      openai: createOpenAI({ apiKey: 'test-key' }),
    };

    const registry = createAgentProviderRegistry(providers);
    const model = registry.languageModel('anthropic:claude-sonnet-4-5-20250929');
    expect(model).toBeDefined();
    expect(model.modelId).toBe('claude-sonnet-4-5-20250929');
  });

  it('throws error for unregistered provider name', () => {
    const providers: ProviderRegistryConfig = {
      anthropic: createAnthropic({ apiKey: 'test-key' }),
    };

    const registry = createAgentProviderRegistry(providers);
    expect(() => registry.languageModel('nonexistent:some-model')).toThrow();
  });
});
