import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const assetTypeSchema = z.enum([
  'hosting',
  'domain',
  'dns',
  'cloud',
  'email',
  'subscription',
  'deployment',
  'other',
]);
const ownershipSchema = z.enum(['client_owned', 'agency_owned', 'shared']);
const paymentResponsibilitySchema = z.enum(['client', 'agency', 'shared']);
const statusSchema = z.enum(['active', 'expiring_soon', 'expired', 'cancelled', 'archived']);
const renewalCycleSchema = z.enum(['monthly', 'quarterly', 'yearly', 'biennial', 'custom']);
const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']);

const assetBodySchema = z.object({
  clientId: mongoIdSchema,
  projectId: mongoIdSchema.optional().nullable(),
  assetType: assetTypeSchema,
  provider: z.string().min(1).max(200).trim(),
  accountName: z.string().min(1).max(200).trim(),
  urlOrIdentifier: z.string().max(2000).trim().optional(),
  ownership: ownershipSchema,
  responsiblePerson: z.string().max(200).trim().optional(),
  registrationDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  sslExpiryDate: z.coerce.date().optional(),
  maintenanceAgreementDate: z.coerce.date().optional(),
  renewalCycle: renewalCycleSchema.optional(),
  expectedCostMinor: z.coerce.number().int().min(0).optional(),
  actualCostMinor: z.coerce.number().int().min(0).optional(),
  clientChargeMinor: z.coerce.number().int().min(0).optional(),
  currency: currencySchema.optional(),
  paymentResponsibility: paymentResponsibilitySchema.optional(),
  status: statusSchema.optional(),
  notes: z.string().max(5000).trim().optional(),
});

export const createAssetSchema = assetBodySchema;
export const updateAssetSchema = assetBodySchema.partial().extend({
  clientId: mongoIdSchema.optional(),
});

export const listAssetsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  assetType: assetTypeSchema.optional(),
  ownership: ownershipSchema.optional(),
  status: statusSchema.optional(),
  expiringBefore: z.coerce.date().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const assetIdParamSchema = mongoIdParamSchema;
