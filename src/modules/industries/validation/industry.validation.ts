import { z } from 'zod';
import {
  createTaxonomySchema,
  updateTaxonomySchema,
} from '@modules/shared/taxonomy/taxonomy.validation';
import { articleSeoFieldsSchema } from '@core/validation/common.validation';

const industrySeoSchema = z.object({
  metaTitle: z.string().max(70).trim().optional(),
  metaDescription: z.string().max(160).trim().optional(),
});

export const createIndustrySchema = createTaxonomySchema
  .extend({
    icon: z.string().trim().optional(),
  })
  .merge(industrySeoSchema)
  .merge(articleSeoFieldsSchema.partial());

export const updateIndustrySchema = updateTaxonomySchema
  .extend({
    icon: z.string().trim().optional(),
  })
  .merge(industrySeoSchema)
  .merge(articleSeoFieldsSchema.partial());
