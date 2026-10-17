import {
  AgencyDocumentKind,
  formatAgencyDocumentNumber,
} from '@core/utils/agency-identifiers';
import { AgencyNumberSequence } from '../model/number-sequence.model';

export async function allocateAgencyDocumentCode(
  kind: AgencyDocumentKind,
  at: Date = new Date(),
): Promise<string> {
  const year = at.getUTCFullYear();
  const updated = await AgencyNumberSequence.findOneAndUpdate(
    { kind, year },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).exec();

  const sequence = updated?.sequence ?? 1;
  return formatAgencyDocumentNumber(kind, sequence, at);
}
