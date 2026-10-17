import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const statusSchema = z.enum(['draft', 'in_progress', 'ready_for_review', 'completed', 'cancelled']);
const itemStatusSchema = z.enum(['pending', 'completed', 'waived', 'blocked']);

export const createHandoverSchema = z.object({
  projectId: mongoIdSchema,
  clientId: mongoIdSchema.optional(),
  title: z.string().max(240).trim().optional(),
  warrantyTerms: z.string().max(5000).trim().optional(),
  maintenanceTerms: z.string().max(5000).trim().optional(),
  credentialTransferNotes: z.string().max(2000).trim().optional(),
  customChecklistItems: z
    .array(z.object({ label: z.string().min(1).max(240).trim() }))
    .max(20)
    .optional(),
});

export const updateHandoverSchema = z.object({
  title: z.string().min(1).max(240).trim().optional(),
  warrantyTerms: z.string().max(5000).trim().optional().nullable(),
  maintenanceTerms: z.string().max(5000).trim().optional().nullable(),
  clientAcceptanceNotes: z.string().max(5000).trim().optional().nullable(),
  credentialTransferNotes: z.string().max(2000).trim().optional().nullable(),
  status: statusSchema.optional(),
});

export const updateChecklistItemSchema = z.object({
  itemId: mongoIdSchema,
  status: itemStatusSchema.optional(),
  responsiblePerson: z.string().max(160).trim().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  blockedReason: z.string().max(1000).trim().optional(),
  waivedReason: z.string().max(1000).trim().optional(),
});

export const listHandoversSchema = paginationQuerySchema.extend({
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  status: statusSchema.optional(),
});

export const handoverIdParamSchema = mongoIdParamSchema;
