import { BadRequestError } from '@core/errors';
import {
  calculateQuotationTotals,
  type LineItemInput,
  type TaxConfigInput,
  type TaxMode,
  type TaxRateInput,
  type QuotationTotals,
} from '@modules/agency/quotations/service/quotation-calc';

export type { LineItemInput, TaxConfigInput, TaxMode, TaxRateInput, QuotationTotals };

/** Indian GST place-of-supply treatment — configurable, not hard-coded per client. */
export type GstTreatment = 'intra_state' | 'inter_state' | 'none' | 'custom';

export type IndianTaxSettings = {
  treatment: GstTreatment;
  /** Combined GST % used to derive CGST/SGST or IGST when treatment is intra/inter */
  gstPercent?: number;
  /** Used when treatment is custom — full rate list */
  customRates?: TaxRateInput[];
  /** exclusive | inclusive | none */
  mode?: TaxMode;
  placeOfSupplyState?: string;
  supplierState?: string;
};

/**
 * Build taxConfig from Indian GST settings with business-rule validation.
 * Does not assume every invoice uses the same treatment.
 */
export function buildTaxConfigFromIndianSettings(settings: IndianTaxSettings): TaxConfigInput {
  const mode = settings.mode ?? (settings.treatment === 'none' ? 'none' : 'exclusive');

  if (settings.treatment === 'none' || mode === 'none') {
    return { mode: 'none', rates: [] };
  }

  if (settings.treatment === 'custom') {
    if (!settings.customRates?.length) {
      throw new BadRequestError('Custom tax treatment requires at least one rate');
    }
    return { mode, rates: settings.customRates };
  }

  const gstPercent = settings.gstPercent ?? 18;
  if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
    throw new BadRequestError('gstPercent must be between 0 and 100');
  }

  if (
    settings.treatment === 'intra_state' &&
    settings.placeOfSupplyState &&
    settings.supplierState &&
    settings.placeOfSupplyState.trim().toUpperCase() !==
      settings.supplierState.trim().toUpperCase()
  ) {
    throw new BadRequestError(
      'Intra-state (CGST/SGST) treatment requires place of supply to match supplier state',
    );
  }

  if (
    settings.treatment === 'inter_state' &&
    settings.placeOfSupplyState &&
    settings.supplierState &&
    settings.placeOfSupplyState.trim().toUpperCase() ===
      settings.supplierState.trim().toUpperCase()
  ) {
    throw new BadRequestError(
      'Inter-state (IGST) treatment requires place of supply to differ from supplier state',
    );
  }

  if (settings.treatment === 'intra_state') {
    // Split evenly; remainder stays on SGST via half-cent rounding on each half
    const half = Math.round((gstPercent / 2) * 100) / 100;
    return {
      mode,
      rates: [
        { name: 'CGST', percent: half },
        { name: 'SGST', percent: half },
      ],
    };
  }

  // inter_state
  return {
    mode,
    rates: [{ name: 'IGST', percent: gstPercent }],
  };
}

/** Authoritative invoice totals — same engine as quotations; never trust client totals. */
export function calculateInvoiceTotals(input: {
  currency?: QuotationTotals['currency'];
  taxConfig: TaxConfigInput;
  lineItems: LineItemInput[];
  documentDiscountPercent?: number;
  documentDiscountMinor?: number;
}): QuotationTotals {
  return calculateQuotationTotals(input);
}

export function assertNonNegativeMinor(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestError(`${field} must be a non-negative integer (minor units)`);
  }
}

export function assertPositiveMinor(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestError(`${field} must be a positive integer (minor units)`);
  }
}
