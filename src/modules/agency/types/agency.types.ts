/**
 * Initial AMS data model shapes (TypeScript contracts).
 * Mongoose collection models for CRUD land in later phases — no production migration here.
 */

import type { Types } from 'mongoose';
import type { IMoneyAmount, AgencyEntityStatus } from '../schemas/agency-base.schema';

export type AgencyClientStatus = AgencyEntityStatus;

export interface AgencyClientDraft {
  code?: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  website?: string;
  billingAddress?: string;
  taxId?: string;
  sourceLeadId?: Types.ObjectId | string | null;
  status: AgencyClientStatus;
  notes?: string;
}

export type AgencyProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface AgencyProjectDraft {
  code?: string;
  clientId: Types.ObjectId | string;
  name: string;
  description?: string;
  status: AgencyProjectStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  portfolioProjectId?: Types.ObjectId | string | null;
  assigneeIds?: Array<Types.ObjectId | string>;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'void';

export interface QuotationDraft {
  code?: string;
  clientId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  status: QuotationStatus;
  issueDate: Date | string;
  validUntil?: Date | string;
  lineItems: Array<{ description: string; quantity: number; unitAmountMinor: number }>;
  currency: IMoneyAmount['currency'];
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'void';

export interface InvoiceDraft {
  code?: string;
  clientId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  quotationId?: Types.ObjectId | string | null;
  status: InvoiceStatus;
  issueDate: Date | string;
  dueDate?: Date | string;
  currency: IMoneyAmount['currency'];
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  balanceMinor: number;
}

export interface PaymentDraft {
  code?: string;
  invoiceId: Types.ObjectId | string;
  amountMinor: number;
  currency: IMoneyAmount['currency'];
  paidAt: Date | string;
  method?: string;
  reference?: string;
}

export interface ExpenseDraft {
  code?: string;
  clientId?: Types.ObjectId | string | null;
  projectId?: Types.ObjectId | string | null;
  category: string;
  description?: string;
  amountMinor: number;
  currency: IMoneyAmount['currency'];
  incurredOn: Date | string;
}

export interface AgencyDocumentDraft {
  title: string;
  clientId?: Types.ObjectId | string | null;
  projectId?: Types.ObjectId | string | null;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface HostingAccountDraft {
  clientId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  provider: string;
  primaryDomain?: string;
  renewsOn?: Date | string;
  notes?: string;
}

/**
 * Credential secrets must never appear in plaintext in persisted documents.
 * Only ciphertext + metadata in future model implementation.
 */
export interface CredentialDraftMeta {
  clientId?: Types.ObjectId | string | null;
  projectId?: Types.ObjectId | string | null;
  hostingAccountId?: Types.ObjectId | string | null;
  label: string;
  username?: string;
  /** Future: ciphertext blob — never accept raw secret in list APIs */
  secretCiphertext?: string;
  iv?: string;
}

export interface MaintenanceRecordDraft {
  clientId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  hostingAccountId?: Types.ObjectId | string | null;
  title: string;
  cadence?: string;
  nextDueOn?: Date | string;
  status: AgencyEntityStatus;
}
