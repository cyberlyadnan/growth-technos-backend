import { z } from 'zod';
import { mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']);

export const reportFiltersSchema = paginationQuerySchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  currency: currencySchema.optional(),
  format: z.enum(['json', 'csv']).optional(),
});
