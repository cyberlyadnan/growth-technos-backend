import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and a number',
  );

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s()-]{7,20}$/, 'Invalid mobile number')
    .optional()
    .or(z.literal('')),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

export const updateProfileSchema = z
  .object({
    firstName: z.string().min(1).max(50).trim().optional(),
    lastName: z.string().min(1).max(50).trim().optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[+]?[\d\s()-]{7,20}$/, 'Invalid mobile number')
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => data.firstName || data.lastName || data.phone !== undefined, {
    message: 'At least one profile field is required',
  });

export const updateAvatarSchema = z.object({
  avatar: z.string().url('Avatar must be a valid URL'),
});
