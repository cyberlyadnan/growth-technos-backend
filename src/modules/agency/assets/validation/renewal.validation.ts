import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const kindSchema = z.enum([
  'domain',
  'hosting',
  'ssl',
  'subscription',
  'maintenance_agreement',
  'other',
]);
const channelSchema = z.enum(['in_app', 'email']);
const statusSchema = z.enum(['pending', 'reminded', 'completed', 'cancelled']);

export const createRenewalSchema = z.object({
  assetId: mongoIdSchema,
  kind: kindSchema,
  title: z.string().min(1).max(300).trim(),
  dueDate: z.coerce.date(),
  remindAt: z.coerce.date(),
  channels: z.array(channelSchema).min(1).max(2).optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const updateRenewalSchema = createRenewalSchema.partial().extend({
  status: statusSchema.optional(),
});

export const listRenewalsSchema = paginationQuerySchema.extend({
  clientId: mongoIdSchema.optional(),
  assetId: mongoIdSchema.optional(),
  kind: kindSchema.optional(),
  status: statusSchema.optional(),
  dueBefore: z.coerce.date().optional(),
});

export const renewalIdParamSchema = mongoIdParamSchema;
