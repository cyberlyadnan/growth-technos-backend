import {
  DeviceType,
  FormFieldType,
  LeadActivityType,
  LeadPriority,
  LeadSource,
  LeadStatus,
  LeadType,
} from '@core/constants/leads';
import { EntityStatus } from '@core/schemas/base.schema';
import {
  IDisplayRules,
  ILeadLocation,
  IMicrocopy,
  IRedirectRules,
  IScoreBreakdown,
  IUtmFields,
} from '@core/schemas/lead-gen.schema';
import { ILeadFormField } from '../model/lead-form.model';

export type LeadFormFieldDto = {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  order?: number;
  placeholder?: string;
  helpText?: string;
  step?: number;
  defaultValue?: string;
};

export type CreateLeadFormDto = {
  name: string;
  slug?: string;
  title?: string;
  description?: string;
  fields?: LeadFormFieldDto[];
  microcopy?: IMicrocopy;
  successMessageId?: string | null;
  thankYouPageId?: string | null;
  redirectRules?: Partial<IRedirectRules>;
  honeypotEnabled?: boolean;
  displayRules?: Partial<IDisplayRules>;
  status?: EntityStatus;
};

export type UpdateLeadFormDto = Partial<CreateLeadFormDto>;

export type LeadFormResponse = {
  id: string;
  name: string;
  slug: string;
  title?: string;
  description?: string;
  fields: ILeadFormField[];
  microcopy: IMicrocopy;
  successMessageId?: string | null;
  thankYouPageId?: string | null;
  redirectRules: IRedirectRules;
  honeypotEnabled: boolean;
  displayRules: IDisplayRules;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type PublicLeadFormResponse = {
  id: string;
  slug: string;
  title?: string;
  description?: string;
  fields: ILeadFormField[];
  microcopy: IMicrocopy;
  honeypotEnabled: boolean;
  redirectRules: IRedirectRules;
};

export type SubmitLeadDto = {
  formSlug?: string;
  formId?: string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  industry?: string;
  businessType?: string;
  serviceInterested?: string;
  monthlyBudget?: string;
  city?: string;
  message?: string;
  consent?: boolean;
  customFields?: Record<string, unknown>;
  leadType?: LeadType;
  source?: LeadSource;
  campaignId?: string;
  offerId?: string;
  magnetId?: string;
  popupId?: string;
  landingPage?: string;
  referrer?: string;
  utm?: IUtmFields;
  website?: string;
};

export type CreateLeadAdminDto = SubmitLeadDto & {
  status?: LeadStatus;
  notes?: string;
  assignedTo?: string | null;
};

export type UpdateLeadDto = {
  status?: LeadStatus;
  priority?: LeadPriority;
  notes?: string;
  assignedTo?: string | null;
  score?: number | null;
  scoreBreakdown?: IScoreBreakdown | null;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  industry?: string;
  serviceInterested?: string;
  message?: string;
};

export type AddLeadNoteDto = {
  note: string;
};

export type LeadActivityResponse = {
  id: string;
  type: LeadActivityType;
  message: string;
  meta?: Record<string, unknown>;
  createdBy?: string | null;
  createdByName?: string;
  createdAt: string;
};

export type LeadResponse = {
  id: string;
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  industry?: string;
  businessType?: string;
  serviceInterested?: string;
  monthlyBudget?: string;
  city?: string;
  message?: string;
  consent: boolean;
  customFields: Record<string, unknown>;
  leadType: LeadType;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  campaignId?: string | null;
  formId?: string | null;
  offerId?: string | null;
  magnetId?: string | null;
  popupId?: string | null;
  landingPage?: string;
  referrer?: string;
  utm: IUtmFields;
  ip?: string;
  userAgent?: string;
  browser?: string;
  device?: string;
  location?: ILeadLocation | null;
  assignedTo?: string | null;
  score?: number | null;
  scoreBreakdown?: IScoreBreakdown | null;
  eventsTriggered: string[];
  notes?: string;
  activityLog: LeadActivityResponse[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubmitLeadResult = {
  leadId: string;
  successMessage?: {
    headline: string;
    body?: string;
  } | null;
  redirect?: {
    mode: string;
    path?: string;
    thankYouSlug?: string;
  } | null;
  analytics?: {
    event: 'lead_submit';
    leadId: string;
    formSlug?: string;
    industry?: string;
    serviceInterested?: string;
    source?: string;
  } | null;
  eventsTriggered?: string[];
};

export type ListLeadFormsQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: EntityStatus;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

export type ListLeadsQuery = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: LeadStatus;
  source?: LeadSource;
  priority?: LeadPriority;
  industry?: string;
  serviceInterested?: string;
  formId?: string;
  campaignId?: string;
  offerId?: string;
  includeTrash?: boolean;
  trashOnly?: boolean;
};

export type ClientMeta = {
  ip?: string;
  userAgent?: string;
  browser?: string;
  device?: DeviceType | string;
  location?: ILeadLocation | null;
};
