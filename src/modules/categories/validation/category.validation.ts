import { z } from 'zod';
import { mongoIdSchema } from '@core/validation/common.validation';
import {
  createTaxonomySchema,
  updateTaxonomySchema,
} from '@modules/shared/taxonomy/taxonomy.validation';

export const createCategorySchema = createTaxonomySchema.extend({
  parent: mongoIdSchema.optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = updateTaxonomySchema.extend({
  parent: mongoIdSchema.optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});
