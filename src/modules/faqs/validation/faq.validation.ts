import { z } from 'zod';
import { mongoIdParamSchema, paginationQuerySchema } from '@core/validation/common.validation';

export const createFaqSchema = z.object({
  question: z.string().min(1).max(300).trim(),
  answer: z.string().min(1).max(5000).trim(),
  category: z.string().max(80).trim().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateFaqSchema = createFaqSchema.partial();

export const listFaqSchema = paginationQuerySchema.extend({
  isActive: z.coerce.boolean().optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  category: z.string().max(80).trim().optional(),
});

export const listPublicFaqSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  featured: z.coerce.boolean().optional(),
  category: z.string().max(80).trim().optional(),
});

export const faqIdParamSchema = mongoIdParamSchema;
