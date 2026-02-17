import type { Action, ActionsResponse } from './schemas/actions.js';

/**
 * Configuration for content sanitization
 */
export interface ContentSanitizerConfig {
  /** Maximum allowed length for content/result_content/note fields (default: 4096) */
  maxContentLength?: number;
}

/**
 * Result of sanitization operation
 */
export interface SanitizeResult<T> {
  /** The sanitized action(s) */
  action: T;
  /** Whether any modifications were made */
  sanitized: boolean;
}

/**
 * Regex to match ASCII control characters (0x00–0x1F) except newline (0x0A) and carriage return (0x0D).
 * These characters can interfere with display or parsing and should be stripped from user-generated content.
 */
const CONTROL_CHAR_REGEX = /[\x00-\x09\x0B\x0C\x0E-\x1F]/g;

/**
 * Strip control characters and truncate a string if needed.
 *
 * @param value - String to sanitize
 * @param maxLength - Maximum allowed length (undefined = no truncation)
 * @returns Sanitized string and flag indicating if it was modified
 */
function sanitizeString(value: string, maxLength?: number): { value: string; modified: boolean } {
  let modified = false;
  let sanitized = value;

  // Strip control characters (except \n and \r)
  const stripped = sanitized.replace(CONTROL_CHAR_REGEX, '');
  if (stripped !== sanitized) {
    sanitized = stripped;
    modified = true;
  }

  // Truncate if exceeds max length
  if (maxLength !== undefined && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
    modified = true;
  }

  return { value: sanitized, modified };
}

/**
 * Sanitize an action's string content fields.
 *
 * Strips ASCII control characters (0x00–0x1F except \n and \r) from:
 * - `content` (reply, publish_job_feedback)
 * - `result_content` (fulfill_job)
 * - `note` (unwrap, store)
 * - `comment` (zap)
 * - `reason` (ignore, escalate)
 *
 * Truncates to `maxContentLength` (default 4096):
 * - `content`
 * - `result_content`
 * - `note`
 *
 * @param action - Action to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized action and flag indicating if modifications were made
 *
 * @example
 * ```ts
 * const result = sanitizeActionContent({
 *   action: 'reply',
 *   content: 'Hello\x00World', // Control char will be stripped
 *   reply_to: '...'
 * });
 * // result.action.content === 'HelloWorld'
 * // result.sanitized === true
 * ```
 */
export function sanitizeActionContent(
  action: Action,
  config: ContentSanitizerConfig = {}
): SanitizeResult<Action> {
  const { maxContentLength = 4096 } = config;
  let sanitized = false;

  // Create a shallow copy to avoid mutating the original
  const result = { ...action } as Action;

  // Sanitize based on action type
  switch (result.action) {
    case 'reply': {
      const contentResult = sanitizeString(result.content, maxContentLength);
      if (contentResult.modified) {
        (result as Extract<Action, { action: 'reply' }>).content = contentResult.value;
        sanitized = true;
      }
      break;
    }

    case 'react': {
      // Emoji field - sanitize but don't truncate
      const emojiResult = sanitizeString(result.emoji);
      if (emojiResult.modified) {
        (result as Extract<Action, { action: 'react' }>).emoji = emojiResult.value;
        sanitized = true;
      }
      break;
    }

    case 'repost':
      // No string content fields to sanitize
      break;

    case 'zap': {
      // Optional comment field - sanitize but don't truncate
      if (result.comment !== undefined) {
        const commentResult = sanitizeString(result.comment);
        if (commentResult.modified) {
          (result as Extract<Action, { action: 'zap' }>).comment = commentResult.value;
          sanitized = true;
        }
      }
      break;
    }

    case 'unwrap': {
      // Optional note field - sanitize and truncate
      if (result.note !== undefined) {
        const noteResult = sanitizeString(result.note, maxContentLength);
        if (noteResult.modified) {
          (result as Extract<Action, { action: 'unwrap' }>).note = noteResult.value;
          sanitized = true;
        }
      }
      break;
    }

    case 'fulfill_job': {
      const resultContentResult = sanitizeString(result.result_content, maxContentLength);
      if (resultContentResult.modified) {
        (result as Extract<Action, { action: 'fulfill_job' }>).result_content =
          resultContentResult.value;
        sanitized = true;
      }
      break;
    }

    case 'publish_job_feedback': {
      const contentResult = sanitizeString(result.content, maxContentLength);
      if (contentResult.modified) {
        (result as Extract<Action, { action: 'publish_job_feedback' }>).content =
          contentResult.value;
        sanitized = true;
      }
      break;
    }

    case 'store': {
      // Optional note field - sanitize and truncate
      if (result.note !== undefined) {
        const noteResult = sanitizeString(result.note, maxContentLength);
        if (noteResult.modified) {
          (result as Extract<Action, { action: 'store' }>).note = noteResult.value;
          sanitized = true;
        }
      }
      break;
    }

    case 'forward': {
      // Destination field - sanitize but don't truncate
      const destResult = sanitizeString(result.destination);
      if (destResult.modified) {
        (result as Extract<Action, { action: 'forward' }>).destination = destResult.value;
        sanitized = true;
      }
      break;
    }

    case 'ignore': {
      const reasonResult = sanitizeString(result.reason);
      if (reasonResult.modified) {
        (result as Extract<Action, { action: 'ignore' }>).reason = reasonResult.value;
        sanitized = true;
      }
      break;
    }

    case 'escalate': {
      const reasonResult = sanitizeString(result.reason);
      if (reasonResult.modified) {
        (result as Extract<Action, { action: 'escalate' }>).reason = reasonResult.value;
        sanitized = true;
      }
      break;
    }
  }

  return { action: result, sanitized };
}

/**
 * Sanitize an actions response (single action or array).
 *
 * @param response - Single action or array of actions
 * @param config - Sanitization configuration
 * @returns Sanitized response and flag indicating if any modifications were made
 */
export function sanitizeActionsResponse(
  response: ActionsResponse,
  config: ContentSanitizerConfig = {}
): SanitizeResult<ActionsResponse> {
  if (Array.isArray(response)) {
    let anySanitized = false;
    const sanitizedActions = response.map((action) => {
      const result = sanitizeActionContent(action, config);
      if (result.sanitized) {
        anySanitized = true;
      }
      return result.action;
    });
    return { action: sanitizedActions, sanitized: anySanitized };
  } else {
    return sanitizeActionContent(response, config);
  }
}
