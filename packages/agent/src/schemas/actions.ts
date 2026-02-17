import { z } from 'zod';

const hexId = z.string().regex(/^[0-9a-f]{64}$/);

export const ReplyActionSchema = z.object({
  action: z.literal('reply'),
  content: z.string().min(1),
  reply_to: hexId,
});

export const ReactActionSchema = z.object({
  action: z.literal('react'),
  emoji: z.string().min(1),
  event_id: hexId,
});

export const RepostActionSchema = z.object({
  action: z.literal('repost'),
  event_id: hexId,
});

export const ZapActionSchema = z.object({
  action: z.literal('zap'),
  amount_msats: z.number().int().positive(),
  event_id: hexId,
  comment: z.string().optional(),
});

export const UnwrapActionSchema = z.object({
  action: z.literal('unwrap'),
  event_id: hexId,
  note: z.string().optional(),
});

export const FulfillJobActionSchema = z.object({
  action: z.literal('fulfill_job'),
  job_id: hexId,
  result_content: z.string().min(1),
  result_kind: z.number().int().min(6000).max(6999),
});

export const PublishJobFeedbackActionSchema = z.object({
  action: z.literal('publish_job_feedback'),
  job_id: hexId,
  status: z.enum(['processing', 'success', 'error', 'partial']),
  content: z.string().min(1),
});

export const StoreActionSchema = z.object({
  action: z.literal('store'),
  event_id: hexId,
  note: z.string().optional(),
});

export const ForwardActionSchema = z.object({
  action: z.literal('forward'),
  event_id: hexId,
  destination: z.string().min(1),
});

export const IgnoreActionSchema = z.object({
  action: z.literal('ignore'),
  reason: z.string().min(1),
});

export const EscalateActionSchema = z.object({
  action: z.literal('escalate'),
  reason: z.string().min(1),
  event_id: hexId,
});

export const ActionSchema = z.discriminatedUnion('action', [
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
]);

export const ActionsResponseSchema = z.union([
  ActionSchema,
  z.array(ActionSchema).min(1).max(5),
]);

export type Action = z.infer<typeof ActionSchema>;
export type ActionsResponse = z.infer<typeof ActionsResponseSchema>;
