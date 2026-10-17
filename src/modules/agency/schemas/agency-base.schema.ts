import { Schema } from 'mongoose';
import { auditSchemaFields, baseSchemaOptions } from '@core/schemas/base.schema';
import type { CurrencyCode } from '@core/utils/money';
import { DEFAULT_AGENCY_CURRENCY } from '@core/utils/money';

/** Shared monetary subdocument — amounts in minor units. */
export interface IMoneyAmount {
  amountMinor: number;
  currency: CurrencyCode;
}

export const moneyAmountSchema = new Schema<IMoneyAmount>(
  {
    amountMinor: { type: Number, required: true },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: DEFAULT_AGENCY_CURRENCY,
    },
  },
  { _id: false },
);

/** Soft-delete + audit fields reused by all future AMS entities. */
export const agencyAuditFields = auditSchemaFields;

export const agencySchemaOptions = baseSchemaOptions;

export type AgencyEntityStatus = 'draft' | 'active' | 'archived' | 'void';

export const AGENCY_ENTITY_STATUSES: AgencyEntityStatus[] = [
  'draft',
  'active',
  'archived',
  'void',
];
