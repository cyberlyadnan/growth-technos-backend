import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']);

export const clientStatusSchema = z.enum([
  'draft',
  'lead',
  'outreach_prepared',
  'contacted',
  'responded',
  'interested',
  'meeting_scheduled',
  'qualified',
  'follow_up',
  'discovery_call',
  'proposal',
  'negotiation',
  'won',
  'active',
  'lost',
  'not_interested',
  'disqualified',
  'inactive',
  'archived',
]);

const addressSchema = z
  .object({
    line1: z.string().max(200).trim().optional(),
    line2: z.string().max(200).trim().optional(),
    city: z.string().max(120).trim().optional(),
    state: z.string().max(120).trim().optional(),
    postalCode: z.string().max(30).trim().optional(),
    country: z.string().max(120).trim().optional(),
  })
  .optional();

const contactPersonSchema = z.object({
  name: z.string().min(1).max(160).trim(),
  email: z.string().email().max(254).optional().or(z.literal('')),
  phone: z.string().max(40).trim().optional(),
  role: z.string().max(120).trim().optional(),
  isPrimary: z.boolean().optional(),
});

const billingPreferencesSchema = z
  .object({
    preferEmailInvoice: z.boolean().optional(),
    invoiceEmail: z.string().email().max(254).optional().or(z.literal('')),
    poRequired: z.boolean().optional(),
  })
  .optional();

const attachmentSchema = z.object({
  mediaId: mongoIdSchema.optional().nullable(),
  url: z.string().url().max(1000),
  fileName: z.string().min(1).max(255).trim(),
  mimeType: z.string().max(120).trim().optional(),
  sizeBytes: z.coerce.number().int().min(0).optional(),
});

const recommendedOfferSchema = z
  .object({
    primaryService: z.string().max(200).trim().optional(),
    estimatedBudgetInr: z.coerce.number().min(0).optional(),
    estimatedTimelineWeeks: z.coerce.number().min(0).optional(),
    keyPainPoint: z.string().max(1000).trim().optional(),
    whyThisPitch: z.string().max(2000).trim().optional(),
  })
  .optional();

const outreachDraftsSchema = z
  .object({
    coldEmail: z
      .object({
        subject: z.string().max(300).trim().optional(),
        body: z.string().max(5000).trim().optional(),
      })
      .optional(),
    linkedinNote: z.string().max(1000).trim().optional(),
    linkedinFollowup: z.string().max(2000).trim().optional(),
    whatsappScript: z.string().max(2000).trim().optional(),
    callScript: z.string().max(5000).trim().optional(),
    discoveryQuestions: z.array(z.string().max(500).trim()).max(20).optional(),
  })
  .optional();

const preCallBattlecardSchema = z
  .object({
    killerDiscoveryQuestion: z.string().max(500).trim().optional(),
    quickAudit: z.string().max(3000).trim().optional(),
    suggestedAngles: z.array(z.string().max(500).trim()).max(10).optional(),
  })
  .optional();

const clientBodyObjectSchema = z.object({
  clientType: z.enum(['individual', 'company']).default('company'),
  name: z.string().min(1).max(200).trim(),
  legalName: z.string().max(240).trim().optional(),
  email: z.string().email().max(254).optional().or(z.literal('')),
  emails: z.array(z.string().email().max(254)).max(10).optional(),
  phone: z.string().max(40).trim().optional(),
  phones: z.array(z.string().max(40).trim()).max(10).optional(),
  contactPersons: z.array(contactPersonSchema).max(20).optional(),
  billingAddress: addressSchema,
  taxId: z.string().max(40).trim().optional(),
  status: clientStatusSchema.optional(),
  website: z.string().max(500).trim().optional().or(z.literal('')),
  domain: z.string().max(200).trim().optional().or(z.literal('')),
  industry: z.string().max(120).trim().optional().or(z.literal('')),
  estimatedHeadcount: z.coerce.number().int().min(0).optional().nullable(),
  estimatedBudgetInr: z.coerce.number().min(0).optional().nullable(),
  detectedSignals: z.array(z.string().max(200).trim()).max(50).optional(),
  recommendedOffer: recommendedOfferSchema,
  outreachDrafts: outreachDraftsSchema,
  preCallBattlecard: preCallBattlecardSchema,
  nextFollowUpDate: z.coerce.date().optional().nullable(),
  followUpNotes: z.string().max(3000).trim().optional().or(z.literal('')),
  assignedToName: z.string().max(120).trim().optional().or(z.literal('')),
  source: z.string().max(80).trim().optional(),
  assignedAccountManagerId: mongoIdSchema.optional().nullable(),
  tags: z.array(z.string().max(60).trim()).max(30).optional(),
  notes: z.string().max(5000).trim().optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
  defaultCurrency: currencySchema.optional(),
  billingPreferences: billingPreferencesSchema,
  attachments: z.array(attachmentSchema).max(20).optional(),
  sourceLeadId: mongoIdSchema.optional().nullable(),
});

export const createClientSchema = clientBodyObjectSchema;

export const updateClientSchema = clientBodyObjectSchema.partial();

export const listClientsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  status: clientStatusSchema.optional(),
  clientType: z.enum(['individual', 'company']).optional(),
  source: z.string().max(80).trim().optional(),
  assignedAccountManagerId: mongoIdSchema.optional(),
  tag: z.string().max(60).trim().optional(),
  isActive: z.coerce.boolean().optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const clientIdParamSchema = mongoIdParamSchema;

export const convertLeadToClientSchema = z.object({
  clientType: z.enum(['individual', 'company']).optional(),
  name: z.string().min(1).max(200).trim().optional(),
  legalName: z.string().max(240).trim().optional(),
  assignedAccountManagerId: mongoIdSchema.optional().nullable(),
  tags: z.array(z.string().max(60).trim()).max(30).optional(),
  notes: z.string().max(5000).trim().optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
  defaultCurrency: currencySchema.optional(),
});

export const addClientNoteSchema = z.object({
  note: z.string().min(1).max(2000).trim(),
});
