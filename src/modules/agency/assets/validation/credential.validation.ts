import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const secretTypeSchema = z.enum(['password', 'api_key', 'access_token', 'other']);
const statusSchema = z.enum(['active', 'archived']);

export const createCredentialSchema = z.object({
  clientId: mongoIdSchema,
  projectId: mongoIdSchema.optional().nullable(),
  assetId: mongoIdSchema.optional().nullable(),
  label: z.string().min(1).max(200).trim(),
  username: z.string().max(200).trim().optional(),
  secretType: secretTypeSchema,
  secret: z.string().min(1).max(8000),
  notes: z.string().max(2000).trim().optional(),
  currentPassword: z.string().min(1).max(200),
});

export const updateCredentialMetaSchema = z.object({
  label: z.string().min(1).max(200).trim().optional(),
  username: z.string().max(200).trim().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  projectId: mongoIdSchema.optional().nullable(),
  assetId: mongoIdSchema.optional().nullable(),
});

export const updateCredentialSecretSchema = z.object({
  secret: z.string().min(1).max(8000),
  currentPassword: z.string().min(1).max(200),
});

export const revealCredentialSchema = z.object({
  currentPassword: z.string().min(1).max(200),
});

export const deleteCredentialSchema = z.object({
  currentPassword: z.string().min(1).max(200),
});

export const listCredentialsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  clientId: mongoIdSchema.optional(),
  projectId: mongoIdSchema.optional(),
  assetId: mongoIdSchema.optional(),
  status: statusSchema.optional(),
  secretType: secretTypeSchema.optional(),
});

export const credentialIdParamSchema = mongoIdParamSchema;
