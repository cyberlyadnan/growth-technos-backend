import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

export const listMediaSchema = paginationQuerySchema.extend({
  folder: z.string().trim().optional(),
  blog: mongoIdSchema.optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const updateMediaSchema = z.object({
  alt: z.string().max(200).trim().optional(),
  caption: z.string().max(300).trim().optional(),
  blog: mongoIdSchema.optional().nullable(),
});

export const uploadMediaFieldsSchema = z.object({
  alt: z.string().max(200).trim().optional(),
  caption: z.string().max(300).trim().optional(),
  blog: mongoIdSchema.optional(),
  folder: z.string().trim().max(80).optional(),
});

export const mediaIdParamSchema = mongoIdParamSchema;
