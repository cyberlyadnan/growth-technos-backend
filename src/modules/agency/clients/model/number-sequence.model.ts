import { Schema, model, Document } from 'mongoose';
import type { AgencyDocumentKind } from '@core/utils/agency-identifiers';

export interface IAgencyNumberSequence extends Document {
  id: string;
  kind: AgencyDocumentKind;
  year: number;
  sequence: number;
  updatedAt: Date;
  createdAt: Date;
}

const agencyNumberSequenceSchema = new Schema<IAgencyNumberSequence>(
  {
    kind: {
      type: String,
      required: true,
      enum: ['client', 'project', 'quotation', 'invoice', 'receipt', 'expense', 'payment'],
    },
    year: { type: Number, required: true },
    sequence: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

agencyNumberSequenceSchema.index({ kind: 1, year: 1 }, { unique: true });

export const AgencyNumberSequence = model<IAgencyNumberSequence>(
  'AgencyNumberSequence',
  agencyNumberSequenceSchema,
);
