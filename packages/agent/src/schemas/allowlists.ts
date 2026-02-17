export type ActionType =
  | 'reply'
  | 'react'
  | 'repost'
  | 'zap'
  | 'unwrap'
  | 'fulfill_job'
  | 'publish_job_feedback'
  | 'store'
  | 'forward'
  | 'ignore'
  | 'escalate';

export type KindCategory =
  | 'social'
  | 'repost'
  | 'reaction'
  | 'gift_wrap'
  | 'dvm_request'
  | 'dvm_result'
  | 'dvm_feedback'
  | 'ilp_peer_info'
  | 'spsp_request'
  | 'spsp_response'
  | 'unknown';

export const KIND_ACTION_ALLOWLISTS: Record<KindCategory, ReadonlySet<ActionType>> = {
  social: new Set(['reply', 'react', 'repost', 'zap', 'ignore', 'escalate']),
  repost: new Set(['react', 'ignore', 'escalate']),
  reaction: new Set(['ignore', 'escalate']),
  gift_wrap: new Set(['unwrap', 'ignore', 'escalate']),
  dvm_request: new Set(['fulfill_job', 'publish_job_feedback', 'ignore', 'escalate']),
  dvm_result: new Set(['store', 'ignore', 'escalate']),
  dvm_feedback: new Set(['ignore', 'escalate']),
  ilp_peer_info: new Set(['store', 'forward', 'ignore', 'escalate']),
  spsp_request: new Set(['store', 'forward', 'ignore', 'escalate']),
  spsp_response: new Set(['store', 'ignore', 'escalate']),
  unknown: new Set(['ignore', 'escalate']),
};

export function getKindCategory(kind: number): KindCategory {
  switch (kind) {
    case 1:
    case 30023:
      return 'social';
    case 6:
      return 'repost';
    case 7:
      return 'reaction';
    case 1059:
      return 'gift_wrap';
    case 7000:
      return 'dvm_feedback';
    case 10032:
      return 'ilp_peer_info';
    case 23194:
      return 'spsp_request';
    case 23195:
      return 'spsp_response';
    default:
      break;
  }

  if (kind >= 5000 && kind <= 5999) return 'dvm_request';
  if (kind >= 6000 && kind <= 6999) return 'dvm_result';

  return 'unknown';
}

export function validateActionForKind(
  action: { action: string },
  kind: number,
): { valid: boolean; reason?: string } {
  const category = getKindCategory(kind);
  const allowlist = KIND_ACTION_ALLOWLISTS[category];

  if (allowlist.has(action.action as ActionType)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Action '${action.action}' is not allowed for kind ${kind} (category: ${category}). Allowed: ${[...allowlist].join(', ')}`,
  };
}
