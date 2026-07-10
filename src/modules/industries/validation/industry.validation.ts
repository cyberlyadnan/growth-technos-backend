import { z } from 'zod';
import {
  createTaxonomySchema,
  updateTaxonomySchema,
} from '@modules/shared/taxonomy/taxonomy.validation';

export const createIndustrySchema = createTaxonomySchema.extend({
  icon: z.string().trim().optional(),
});

export const updateIndustrySchema = updateTaxonomySchema.extend({
  icon: z.string().trim().optional(),
});
