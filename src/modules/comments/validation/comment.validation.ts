import { z } from 'zod';
import { CommentSortOrder, CommentStatus } from '@core/constants';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(5000).trim(),
  parentId: mongoIdSchema.optional().nullable(),
  guestName: z.string().min(1).max(120).trim().optional(),
  guestEmail: z.string().email('Enter a valid email').max(160).trim().optional(),
  guestWebsite: z.string().url('Enter a valid website URL').max(300).trim().optional().or(z.literal('')),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(5000).trim(),
});

export const reportCommentSchema = z.object({
  reason: z.string().max(500).trim().optional(),
  reporterEmail: z.string().email().max(160).trim().optional(),
});

export const moderateCommentSchema = z.object({
  status: z.nativeEnum(CommentStatus),
  isPinned: z.boolean().optional(),
});

export const listCommentsSchema = paginationQuerySchema.extend({
  sort: z.nativeEnum(CommentSortOrder).optional(),
  status: z.nativeEnum(CommentStatus).optional(),
  blogId: mongoIdSchema.optional(),
  includeTrash: z.coerce.boolean().optional(),
});

export const commentIdParamSchema = mongoIdParamSchema;
export const blogIdParamSchema = mongoIdParamSchema;
