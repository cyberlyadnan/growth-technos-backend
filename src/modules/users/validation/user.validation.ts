import { z } from 'zod';
import { UserStatus } from '@core/constants';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and a number',
  );

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[\d\s()-]{7,20}$/, 'Invalid mobile number')
  .optional()
  .or(z.literal(''));

export const createAdminUserSchema = z.object({
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
  phone: phoneSchema,
  avatar: z.string().url().optional().or(z.literal('')),
  status: z.nativeEnum(UserStatus).optional().default(UserStatus.ACTIVE),
});

export const updateAdminUserSchema = z.object({
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: phoneSchema,
  avatar: z.string().url().optional().or(z.literal('')),
  status: z.nativeEnum(UserStatus).optional(),
});

export const resetAdminPasswordSchema = z.object({
  password: passwordSchema,
});

export const listAdminUsersSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const adminUserIdSchema = z.object({
  id: z.string().min(1),
});
