import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const categorySchema = z.enum([
  'quotation',
  'invoice',
  'agreement',
  'nda',
  'specification',
  'approval',
  'deliverable',
  'payment_proof',
  'maintenance_agreement',
  'handover_report',
  'other',
]);

export const listDocumentsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  category: categorySchema.optional(),
  handoverId: mongoIdSchema.optional(),
});

export const uploadDocumentMetaSchema = z.object({
  title: z.string().min(1).max(240).trim(),
  category: categorySchema,
  clientId: mongoIdSchema,
  projectId: mongoIdSchema.optional().nullable(),
  handoverId: mongoIdSchema.optional().nullable(),
  description: z.string().max(2000).trim().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(240).trim().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  category: categorySchema.optional(),
});

export const documentIdParamSchema = mongoIdParamSchema;

export const listActivitySchema = paginationQuerySchema.extend({
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  entityType: z
    .enum([
      'client',
      'project',
      'quotation',
      'invoice',
      'payment',
      'expense',
      'asset',
      'credential',
      'renewal',
      'maintenance',
      'support',
      'document',
      'handover',
      'agency',
    ])
    .optional(),
  action: z.string().max(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
