import { z } from 'zod';
import { mongoIdParamSchema, paginationQuerySchema } from '@core/validation/common.validation';

export const createTaxonomySchema = z.object({
  name: z.string().min(1).max(120).trim(),
  slug: z.string().min(1).max(120).trim().toLowerCase().optional(),
  description: z.string().max(500).trim().optional(),
  isActive: z.boolean().optional(),
});

export const updateTaxonomySchema = createTaxonomySchema.partial();

export const listTaxonomySchema = paginationQuerySchema.extend({
  isActive: z.coerce.boolean().optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const listPublicTaxonomySchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
});

export const taxonomyIdParamSchema = mongoIdParamSchema;
