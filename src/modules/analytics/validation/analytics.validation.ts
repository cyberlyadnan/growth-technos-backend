import { z } from 'zod';

export const eventNames = [
  'page_view',
  'cta_click',
  'audit_cta_click',
  'whatsapp_click',
  'call_click',
  'form_start',
  'form_error',
  'article_engaged',
  'article_scroll',
] as const;
const path = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .regex(/^\/(?!\/)[^?#\s]*$/)
  .refine((p) => !/^\/(admin|marketing|api)(\/|$)/.test(p), 'Only public pages can be tracked');
const field = z.string().trim().max(200).optional();
export const trackingSchema = z.object({
  eventId: z.string().uuid().optional(),
  eventName: z.enum(eventNames).default('page_view'),
  path,
  landingPath: path.optional(),
  sessionId: z
    .string()
    .trim()
    .min(8)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  referrer: z
    .string()
    .max(2000)
    .optional()
    .transform((value) => {
      try {
        const url = new URL(value || '');
        return /^https?:$/.test(url.protocol) ? url.origin : '';
      } catch {
        return '';
      }
    }),
  device: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  placement: z.string().trim().max(120).optional(),
  scrollDepth: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]).optional(),
  utm: z
    .object({
      utmSource: field,
      utmMedium: field,
      utmCampaign: field,
      utmContent: field,
      utmTerm: field,
    })
    .optional(),
});
export const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  channel: z.enum(['all', 'gbp']).default('all'),
});
export type TrackingInput = z.infer<typeof trackingSchema>;
