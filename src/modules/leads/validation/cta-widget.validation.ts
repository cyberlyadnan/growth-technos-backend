import { z } from 'zod';
import { CtaPlacement, WidgetPosition } from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';
import { ctaActionZod, displayRulesZod, publicOffersQuerySchema } from './offer.validation';

const frequencyControlZod = z
  .object({
    cookieKey: z.string().max(120).trim().optional(),
    maxShows: z.number().int().min(0).max(100).optional(),
    cooldownHours: z.number().min(0).max(8760).optional(),
    oncePerSession: z.boolean().optional(),
  })
  .optional();

const baseListSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(EntityStatus).optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const publicWidgetsQuerySchema = publicOffersQuerySchema;

export const createStickyCtaSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  placement: z.nativeEnum(CtaPlacement).optional(),
  position: z.nativeEnum(WidgetPosition).optional(),
  ctaAction: ctaActionZod,
  showOnMobile: z.boolean().optional(),
  showOnDesktop: z.boolean().optional(),
  displayRules: displayRulesZod,
  frequencyControl: frequencyControlZod,
  priority: z.number().int().min(0).max(1000).optional(),
  campaignId: mongoIdSchema.nullable().optional(),
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updateStickyCtaSchema = createStickyCtaSchema.partial();
export const listStickyCtasSchema = baseListSchema;
export const stickyCtaIdParamSchema = mongoIdParamSchema;

export const createFloatingCtaSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  position: z.nativeEnum(WidgetPosition).optional(),
  ctaAction: ctaActionZod,
  showOnMobile: z.boolean().optional(),
  showOnDesktop: z.boolean().optional(),
  displayRules: displayRulesZod,
  frequencyControl: frequencyControlZod,
  priority: z.number().int().min(0).max(1000).optional(),
  campaignId: mongoIdSchema.nullable().optional(),
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updateFloatingCtaSchema = createFloatingCtaSchema.partial();
export const listFloatingCtasSchema = baseListSchema;
export const floatingCtaIdParamSchema = mongoIdParamSchema;

export const createContactWidgetSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  position: z.nativeEnum(WidgetPosition).optional(),
  headline: z.string().max(160).trim().optional(),
  body: z.string().max(500).trim().optional(),
  phone: z.string().max(40).trim().optional(),
  hoursNote: z.string().max(300).trim().optional(),
  ctaAction: ctaActionZod,
  displayRules: displayRulesZod,
  priority: z.number().int().min(0).max(1000).optional(),
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updateContactWidgetSchema = createContactWidgetSchema.partial();
export const listContactWidgetsSchema = baseListSchema;
export const contactWidgetIdParamSchema = mongoIdParamSchema;

export const createWhatsAppWidgetSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  position: z.nativeEnum(WidgetPosition).optional(),
  headline: z.string().max(160).trim().optional(),
  prefilledMessage: z.string().max(500).trim().optional(),
  whatsappNumber: z.string().min(1).max(40).trim(),
  hoursNote: z.string().max(300).trim().optional(),
  ctaAction: ctaActionZod,
  displayRules: displayRulesZod,
  priority: z.number().int().min(0).max(1000).optional(),
  status: z.nativeEnum(EntityStatus).optional(),
});

export const updateWhatsAppWidgetSchema = createWhatsAppWidgetSchema.partial().extend({
  whatsappNumber: z.string().min(1).max(40).trim().optional(),
});
export const listWhatsAppWidgetsSchema = baseListSchema;
export const whatsappWidgetIdParamSchema = mongoIdParamSchema;
