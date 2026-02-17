import type { NostrEvent } from 'nostr-tools/pure';
import type { LanguageModel } from 'ai';
import { generateText, Output, NoOutputGeneratedError } from 'ai';
import type { KindRegistry } from './kind-registry.js';
import type { HandlerLoader } from './handler-loader.js';
import { ActionsResponseSchema } from './schemas/actions.js';
import type { ActionsResponse } from './schemas/actions.js';
import { validateActionForKind } from './schemas/allowlists.js';
import { buildEventPrompt } from './prompt-builder.js';

export interface HandleNostrEventConfig {
  model: LanguageModel;
  kindRegistry: KindRegistry;
  handlerLoader: HandlerLoader;
}

export interface HandleNostrEventResult {
  actions: ActionsResponse;
  usage?: { inputTokens: number; outputTokens: number };
  retried: boolean;
}

export async function handleNostrEvent(
  event: NostrEvent,
  config: HandleNostrEventConfig,
): Promise<HandleNostrEventResult> {
  const handlerPath = config.kindRegistry.resolve(event.kind);

  if (handlerPath === null) {
    return {
      actions: { action: 'ignore', reason: `No handler for kind ${event.kind}` },
      retried: false,
    };
  }

  const handlerMarkdown = await config.handlerLoader.load(handlerPath);
  const userPrompt = buildEventPrompt(event);

  let retried = false;
  let result;

  try {
    result = await generateText({
      model: config.model,
      system: handlerMarkdown,
      prompt: userPrompt,
      output: Output.object({ schema: ActionsResponseSchema }),
    });
  } catch (error: unknown) {
    if (NoOutputGeneratedError.isInstance(error)) {
      retried = true;
      const retryPrompt =
        userPrompt +
        '\n\nYour previous response was not valid JSON. Please respond with ONLY a valid JSON action object.';

      try {
        result = await generateText({
          model: config.model,
          system: handlerMarkdown,
          prompt: retryPrompt,
          output: Output.object({ schema: ActionsResponseSchema }),
        });
      } catch (retryError: unknown) {
        if (NoOutputGeneratedError.isInstance(retryError)) {
          return {
            actions: {
              action: 'escalate',
              reason: 'Failed to generate valid action after retry',
              event_id: event.id,
            },
            retried: true,
          };
        }
        throw retryError;
      }
    } else {
      throw error;
    }
  }

  const output = result.output as ActionsResponse;
  const usage = {
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
  };

  // Allowlist enforcement
  const actions = Array.isArray(output) ? output : [output];
  for (const action of actions) {
    const validation = validateActionForKind(action, event.kind);
    if (!validation.valid) {
      return {
        actions: {
          action: 'escalate',
          reason: `Action '${action.action}' not allowed for kind ${event.kind}`,
          event_id: event.id,
        },
        retried,
      };
    }
  }

  return { actions: output, usage, retried };
}
