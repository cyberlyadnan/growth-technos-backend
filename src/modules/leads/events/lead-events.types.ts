import { LeadEventType, LeadSource, LeadType } from '@core/constants/leads';
import { IUtmFields } from '@core/schemas/lead-gen.schema';

export type LeadSubmittedPayload = {
  leadId: string;
  /** false when the MongoDB save failed (notifications still go out). */
  savedToDatabase?: boolean;
  formId?: string;
  formSlug?: string;
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  businessName?: string;
  industry?: string;
  serviceInterested?: string;
  monthlyBudget?: string;
  projectBudget?: string;
  projectTimeline?: string;
  currentTools?: string[];
  clientSubmittedAt?: string;
  city?: string;
  message?: string;
  leadType: LeadType;
  source: LeadSource;
  landingPage?: string;
  referrer?: string;
  utm?: IUtmFields;
  campaignId?: string;
  offerId?: string;
  magnetId?: string;
  popupId?: string;
  occurredAt: string;
};

export type LeadEventHandlerResult = {
  type: LeadEventType;
  ok: boolean;
  skipped?: boolean;
  detail?: string;
};

export type LeadEventHandler = (payload: LeadSubmittedPayload) => Promise<LeadEventHandlerResult>;

export type LeadEventDispatchResult = {
  triggered: LeadEventType[];
  results: LeadEventHandlerResult[];
};
