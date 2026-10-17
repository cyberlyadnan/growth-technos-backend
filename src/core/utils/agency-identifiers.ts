/**
 * Agency document numbering — format helpers only.
 * Sequence allocation / persistence belongs in a later phase.
 */

export type AgencyDocumentKind =
  | 'client'
  | 'project'
  | 'quotation'
  | 'invoice'
  | 'receipt'
  | 'expense'
  | 'payment';

export type AgencyNumberingRule = {
  kind: AgencyDocumentKind;
  prefix: string;
  /** Include calendar year segment, e.g. GT-INV-2026-0001 */
  includeYear: boolean;
  /** Zero-padded sequence width */
  sequenceWidth: number;
  /** Example display string (documentation / UI only) */
  example: string;
};

export const AGENCY_NUMBERING_RULES: Record<AgencyDocumentKind, AgencyNumberingRule> = {
  client: {
    kind: 'client',
    prefix: 'GT-CL',
    includeYear: true,
    sequenceWidth: 4,
    example: 'GT-CL-2026-0001',
  },
  project: {
    kind: 'project',
    prefix: 'GT-PRJ',
    includeYear: true,
    sequenceWidth: 4,
    example: 'GT-PRJ-2026-0001',
  },
  quotation: {
    kind: 'quotation',
    prefix: 'GT-QT',
    includeYear: true,
    sequenceWidth: 4,
    example: 'GT-QT-2026-0001',
  },
  invoice: {
    kind: 'invoice',
    prefix: 'GT-INV',
    includeYear: true,
    sequenceWidth: 4,
    example: 'GT-INV-2026-0001',
  },
  receipt: {
    kind: 'receipt',
    prefix: 'GT-RCT',
    includeYear: true,
    sequenceWidth: 4,
    example: 'GT-RCT-2026-0001',
  },
  expense: {
    kind: 'expense',
    prefix: 'GT-EXP',
    includeYear: true,
    sequenceWidth: 4,
    example: 'GT-EXP-2026-0001',
  },
  payment: {
    kind: 'payment',
    prefix: 'GT-PAY',
    includeYear: true,
    sequenceWidth: 4,
    example: 'GT-PAY-2026-0001',
  },
};

export function formatAgencyDocumentNumber(
  kind: AgencyDocumentKind,
  sequence: number,
  at: Date = new Date(),
): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Sequence must be a positive integer');
  }

  const rule = AGENCY_NUMBERING_RULES[kind];
  const padded = String(sequence).padStart(rule.sequenceWidth, '0');
  if (rule.includeYear) {
    return `${rule.prefix}-${at.getUTCFullYear()}-${padded}`;
  }
  return `${rule.prefix}-${padded}`;
}

export function getAgencyNumberingConfig(): AgencyNumberingRule[] {
  return Object.values(AGENCY_NUMBERING_RULES);
}
