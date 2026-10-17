import { z } from 'zod';
import { mongoIdParamSchema, mongoIdSchema, paginationQuerySchema } from '@core/validation/common.validation';

const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']);
const statusSchema = z.enum([
  'draft',
  'planned',
  'active',
  'on_hold',
  'completed',
  'cancelled',
  'archived',
]);
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
const billingModelSchema = z.enum([
  'fixed_price',
  'milestone_based',
  'hourly',
  'recurring',
  'custom',
]);

const moneySchema = z.object({
  amountMinor: z.coerce.number().int().min(0),
  currency: currencySchema.optional(),
});

const scopeSchema = z
  .object({
    summary: z.string().max(5000).trim().optional(),
    items: z.array(z.string().max(500).trim()).max(100).optional(),
  })
  .optional();

const milestoneSchema = z.object({
  key: z.string().min(1).max(64).trim().optional(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'done', 'cancelled']).optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).optional(),
  order: z.coerce.number().int().min(0).optional(),
  dependsOnKeys: z.array(z.string().max(64).trim()).max(20).optional(),
});

const taskSchema = z.object({
  key: z.string().min(1).max(64).trim().optional(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  milestoneKey: z.string().max(64).trim().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'blocked']).optional(),
  priority: prioritySchema.optional(),
  assigneeId: mongoIdSchema.optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

const deliverableSchema = z.object({
  key: z.string().min(1).max(64).trim().optional(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  status: z.enum(['pending', 'delivered', 'accepted', 'rejected']).optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

const dependencySchema = z.object({
  key: z.string().min(1).max(64).trim().optional(),
  description: z.string().min(1).max(500).trim(),
  fromMilestoneKey: z.string().max(64).trim().optional(),
  toMilestoneKey: z.string().max(64).trim().optional(),
});

const attachmentSchema = z.object({
  mediaId: mongoIdSchema.optional().nullable(),
  url: z.string().url().max(1000),
  fileName: z.string().min(1).max(255).trim(),
  mimeType: z.string().max(120).trim().optional(),
  sizeBytes: z.coerce.number().int().min(0).optional(),
});

const projectBodyObjectSchema = z.object({
  clientId: mongoIdSchema,
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).trim().optional(),
  serviceCategory: z.string().max(120).trim().optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assignedManagerId: mongoIdSchema.optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  targetDeliveryDate: z.coerce.date().optional().nullable(),
  completionDate: z.coerce.date().optional().nullable(),
  billingModel: billingModelSchema.optional(),
  contractValue: moneySchema.optional(),
  estimatedCostMinor: z.coerce.number().int().min(0).optional().nullable(),
  scope: scopeSchema,
  milestones: z.array(milestoneSchema).max(50).optional(),
  tasks: z.array(taskSchema).max(200).optional(),
  deliverables: z.array(deliverableSchema).max(100).optional(),
  dependencies: z.array(dependencySchema).max(100).optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).optional(),
  stagingUrl: z.string().url().max(1000).optional().or(z.literal('')),
  productionUrl: z.string().url().max(1000).optional().or(z.literal('')),
  warrantyDays: z.coerce.number().int().min(0).max(3650).optional(),
  postDeliveryObligations: z.string().max(5000).trim().optional(),
  quotationId: mongoIdSchema.optional().nullable(),
  quotationCode: z.string().max(40).trim().optional(),
  portfolioProjectId: mongoIdSchema.optional().nullable(),
  tags: z.array(z.string().max(60).trim()).max(30).optional(),
  notes: z.string().max(5000).trim().optional(),
  attachments: z.array(attachmentSchema).max(20).optional(),
});

export const createProjectSchema = projectBodyObjectSchema;

export const updateProjectSchema = projectBodyObjectSchema.partial().extend({
  clientId: mongoIdSchema.optional(),
});

export const listProjectsSchema = paginationQuerySchema.extend({
  search: z.string().max(120).trim().optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  billingModel: billingModelSchema.optional(),
  clientId: mongoIdSchema.optional(),
  assignedManagerId: mongoIdSchema.optional(),
  serviceCategory: z.string().max(120).trim().optional(),
  includeTrash: z.coerce.boolean().optional(),
  trashOnly: z.coerce.boolean().optional(),
});

export const projectIdParamSchema = mongoIdParamSchema;

export const transitionProjectStatusSchema = z.object({
  status: statusSchema,
});

export const addProjectNoteSchema = z.object({
  note: z.string().min(1).max(2000).trim(),
});

export const approveScopeSchema = z.object({
  note: z.string().max(2000).trim().optional(),
});

export const createChangeRequestSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(5000).trim(),
  proposedScopeSummary: z.string().max(5000).trim().optional(),
  proposedScopeItems: z.array(z.string().max(500).trim()).max(100).optional(),
});

export const resolveChangeRequestSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  resolutionNote: z.string().max(2000).trim().optional(),
  applyToScope: z.boolean().optional(),
});

export const changeRequestParamSchema = z.object({
  id: mongoIdSchema,
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid change request key'),
});

export const addAcceptanceSchema = z.object({
  notes: z.string().max(2000).trim().optional(),
});
