export { createAgentProviderRegistry } from './providers.js';
export type { ProviderRegistryConfig } from './providers.js';

export { KindRegistry } from './kind-registry.js';
export type { KindClassification } from './kind-registry.js';

export { HandlerLoader, HandlerNotFoundError } from './handler-loader.js';

export {
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
} from './schemas/actions.js';
export type { Action, ActionsResponse } from './schemas/actions.js';

export {
  KIND_ACTION_ALLOWLISTS,
  getKindCategory,
  validateActionForKind,
} from './schemas/allowlists.js';
export type { ActionType, KindCategory } from './schemas/allowlists.js';

export { handleNostrEvent } from './handler.js';
export type { HandleNostrEventConfig, HandleNostrEventResult } from './handler.js';

export { buildEventPrompt } from './prompt-builder.js';

export { RateLimiter } from './rate-limiter.js';
export type { RateLimiterConfig, RateLimitCheckResult } from './rate-limiter.js';

export { sanitizeActionContent, sanitizeActionsResponse } from './content-sanitizer.js';
export type { ContentSanitizerConfig, SanitizeResult } from './content-sanitizer.js';

export { AuditLogger } from './audit-log.js';
export type { AuditEntry, AuditRecord, AuditQueryFilters } from './audit-log.js';
