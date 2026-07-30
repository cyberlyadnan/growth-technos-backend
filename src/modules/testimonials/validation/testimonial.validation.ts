import { z } from 'zod';
import { mongoIdParamSchema, paginationQuerySchema } from '@core/validation/common.validation';

export const createTestimonialSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  role: z.string().max(160).trim().optional(),
  company: z.string().max(160).trim().optional(),
  content: z.string().min(1).max(3000).trim(),
  avatar: z.string().max(500).trim().optional().or(z.literal('')),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();

export const listTestimonialSchema = paginationQuerySchema.extend({
  isActive: z.coerce.boolean().optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
});

export const listPublicTestimonialSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  featured: z.coerce.boolean().optional(),
});

export const testimonialIdParamSchema = mongoIdParamSchema;
