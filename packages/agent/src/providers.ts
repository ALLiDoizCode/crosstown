import { createProviderRegistry } from 'ai';

/**
 * The provider type accepted by `createProviderRegistry`.
 * Derived from the Vercel AI SDK function signature to stay in sync
 * without importing internal `@ai-sdk/provider` types directly.
 */
type RegistryProvider = Parameters<typeof createProviderRegistry>[0][string];

/**
 * Generic provider configuration — a map of provider names to
 * pre-constructed @ai-sdk/* provider instances.
 *
 * @example
 * const config: ProviderRegistryConfig = {
 *   anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
 *   openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY! }),
 *   moonshotai: createMoonshotAI({ apiKey: process.env.MOONSHOT_API_KEY! }),
 *   ollama: createOpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' }),
 * };
 */
export type ProviderRegistryConfig = Record<string, RegistryProvider>;

/**
 * Creates an agent provider registry from a map of named provider instances.
 * The registry enables model resolution by string identifier (e.g., "anthropic:claude-sonnet-4-5-20250929").
 *
 * @param providers - Map of provider names to @ai-sdk/* provider instances
 * @returns A Vercel AI SDK provider registry
 */
export function createAgentProviderRegistry(providers: ProviderRegistryConfig) {
  return createProviderRegistry(providers);
}
