import { z } from 'zod';
import {
  createTaxonomySchema,
  updateTaxonomySchema,
} from '@modules/shared/taxonomy/taxonomy.validation';

export const createTagSchema = createTaxonomySchema.extend({
  color: z.string().max(20).trim().optional(),
  description: z.string().max(300).trim().optional(),
});

export const updateTagSchema = updateTaxonomySchema.extend({
  color: z.string().max(20).trim().optional(),
  description: z.string().max(300).trim().optional(),
});
