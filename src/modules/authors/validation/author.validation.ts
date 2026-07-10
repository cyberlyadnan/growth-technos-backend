import { z } from 'zod';
import { mongoIdSchema } from '@core/validation/common.validation';
import {
  createTaxonomySchema,
  listTaxonomySchema,
  taxonomyIdParamSchema,
  updateTaxonomySchema,
} from '@modules/shared/taxonomy/taxonomy.validation';

export const createAuthorSchema = createTaxonomySchema.extend({
  designation: z.string().max(120).trim().optional(),
  photo: z.string().url().optional().or(z.literal('')),
  bio: z.string().max(2000).trim().optional(),
  linkedIn: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  user: mongoIdSchema.optional().nullable(),
});

export const updateAuthorSchema = updateTaxonomySchema.extend({
  designation: z.string().max(120).trim().optional(),
  photo: z.string().url().optional().or(z.literal('')),
  bio: z.string().max(2000).trim().optional(),
  linkedIn: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  user: mongoIdSchema.optional().nullable(),
});

export { listTaxonomySchema as listAuthorSchema, taxonomyIdParamSchema as authorIdParamSchema };
