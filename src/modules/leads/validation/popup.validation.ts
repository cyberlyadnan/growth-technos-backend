import { z } from 'zod';
import { PopupTrigger } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import {
  mongoIdParamSchema,
  mongoIdSchema,
  paginationQuerySchema,
} from '@core/validation/common.validation';
import { displayRulesZod, publicOffersQuerySchema } from './offer.validation';

const triggerConfigZod = z
  .object({
    scrollPercentage: z.number().min(0).max(100).optional(),
    delayMs: z.number().int().min(0).max(600000).optional(),
    buttonSelector: z.string().max(200).trim().optional(),
  })
  .optional();

const popupContentZod = z
  .object({
    headline: z.string().max(220).trim().optional(),
    body: z.string().max(3000).trim().optional(),
    formId: mongoIdSchema.nullable().optional(),
    offerId: mongoIdSchema.nullable().optional(),
    magnetId: mongoIdSchema.nullable().optional(),
    imageUrl: z.string().max(2000).trim().optional(),
  })
  .optional();

const frequencyControlZod = z
  .object({
    cookieKey: z.string().max(120).trim().optional(),
    maxShows: z.number().int().min(0).max(100).optional(),
    cooldownHours: z.number().min(0).max(8760).optional(),
    oncePerSession: z.boolean().optional(),
  })
  .optional();

export const createPopupSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  trigger: z.nativeEnum(PopupTrigger).optional(),
  triggerConfig: triggerConfigZod,
  content: popupContentZod,
  frequencyControl: frequencyControlZod,
  displayRules: displayRulesZod,
  campaignId: mongoIdSchema.nullable().optional(),
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updatePopupSchema = createPopupSchema.partial();

export const listPopupsSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(EntityStatus).optional(),
  trigger: z.nativeEnum(PopupTrigger).optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const publicPopupsQuerySchema = publicOffersQuerySchema.extend({
  trigger: z.nativeEnum(PopupTrigger).optional(),
});

export const popupIdParamSchema = mongoIdParamSchema;
