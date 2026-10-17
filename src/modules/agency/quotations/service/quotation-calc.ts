import { BadRequestError } from '@core/errors';
import {
  addMinor,
  DEFAULT_AGENCY_CURRENCY,
  percentOfMinor,
  type CurrencyCode,
} from '@core/utils/money';

export type TaxMode = 'exclusive' | 'inclusive' | 'none';

export type TaxRateInput = {
  name: string;
  percent: number;
};

export type LineItemInput = {
  key?: string;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  /** Line discount percent 0–100 */
  discountPercent?: number;
  /** Fixed discount in minor units (applied after percent) */
  discountMinor?: number;
  serviceId?: string | null;
  catalogItemId?: string | null;
  unit?: string;
};

export type TaxConfigInput = {
  mode: TaxMode;
  rates: TaxRateInput[];
};

export type CalculatedLine = {
  key: string;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  discountPercent: number;
  discountMinor: number;
  lineGrossMinor: number;
  lineDiscountTotalMinor: number;
  lineNetMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
  taxBreakdown: Array<{ name: string; percent: number; amountMinor: number }>;
  serviceId?: string | null;
  catalogItemId?: string | null;
  unit?: string;
};

export type QuotationTotals = {
  currency: CurrencyCode;
  subtotalMinor: number;
  discountTotalMinor: number;
  taxableMinor: number;
  taxMinor: number;
  grandTotalMinor: number;
  taxBreakdown: Array<{ name: string; percent: number; amountMinor: number }>;
  lines: CalculatedLine[];
};

function assertMinor(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestError(`${field} must be a non-negative integer (minor units)`);
  }
}

function assertQuantity(value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestError('Line quantity must be a positive number');
  }
}

function normalizeRates(rates: TaxRateInput[] | undefined, mode: TaxMode): TaxRateInput[] {
  if (mode === 'none') return [];
  const list = (rates ?? []).filter((rate) => rate.name?.trim() && Number.isFinite(rate.percent));
  for (const rate of list) {
    if (rate.percent < 0 || rate.percent > 100) {
      throw new BadRequestError(`Tax rate "${rate.name}" must be between 0 and 100`);
    }
  }
  return list.map((rate) => ({ name: rate.name.trim(), percent: rate.percent }));
}

/**
 * Authoritative quotation math — never trust client-supplied totals.
 * All money values are integer minor units.
 */
export function calculateQuotationTotals(input: {
  currency?: CurrencyCode;
  taxConfig: TaxConfigInput;
  lineItems: LineItemInput[];
  /** Document-level discount percent applied to subtotal after line discounts */
  documentDiscountPercent?: number;
  documentDiscountMinor?: number;
}): QuotationTotals {
  const currency = input.currency ?? DEFAULT_AGENCY_CURRENCY;
  const mode = input.taxConfig?.mode ?? 'exclusive';
  const rates = normalizeRates(input.taxConfig?.rates, mode);

  if (!input.lineItems?.length) {
    throw new BadRequestError('At least one line item is required');
  }

  const lines: CalculatedLine[] = input.lineItems.map((raw, index) => {
    assertQuantity(raw.quantity);
    assertMinor(raw.unitPriceMinor, `lineItems[${index}].unitPriceMinor`);

    const discountPercent = raw.discountPercent ?? 0;
    if (discountPercent < 0 || discountPercent > 100) {
      throw new BadRequestError(`lineItems[${index}].discountPercent must be 0–100`);
    }
    const fixedDiscount = raw.discountMinor ?? 0;
    assertMinor(fixedDiscount, `lineItems[${index}].discountMinor`);

    const lineGrossMinor = Math.round(raw.quantity * raw.unitPriceMinor);
    const percentDiscountMinor = percentOfMinor(lineGrossMinor, discountPercent);
    const lineDiscountTotalMinor = Math.min(
      lineGrossMinor,
      addMinor(percentDiscountMinor, fixedDiscount),
    );
    const afterDiscount = lineGrossMinor - lineDiscountTotalMinor;

    let lineNetMinor = afterDiscount;
    let lineTaxMinor = 0;
    const taxBreakdown: CalculatedLine['taxBreakdown'] = [];

    if (mode === 'exclusive') {
      for (const rate of rates) {
        const amountMinor = percentOfMinor(afterDiscount, rate.percent);
        taxBreakdown.push({ name: rate.name, percent: rate.percent, amountMinor });
        lineTaxMinor += amountMinor;
      }
      lineNetMinor = afterDiscount;
    } else if (mode === 'inclusive' && rates.length) {
      const combinedPercent = rates.reduce((sum, rate) => sum + rate.percent, 0);
      if (combinedPercent >= 100) {
        throw new BadRequestError('Inclusive tax rates must total less than 100%');
      }
      // Extract tax from inclusive amount: net = gross / (1 + r/100)
      lineNetMinor = Math.round((afterDiscount * 100) / (100 + combinedPercent));
      lineTaxMinor = afterDiscount - lineNetMinor;
      let allocated = 0;
      rates.forEach((rate, rateIndex) => {
        const amountMinor =
          rateIndex === rates.length - 1
            ? lineTaxMinor - allocated
            : Math.round((lineTaxMinor * rate.percent) / combinedPercent);
        allocated += amountMinor;
        taxBreakdown.push({ name: rate.name, percent: rate.percent, amountMinor });
      });
    }

    const lineTotalMinor =
      mode === 'inclusive' ? afterDiscount : addMinor(lineNetMinor, lineTaxMinor);

    return {
      key: raw.key?.trim() || `line_${index + 1}`,
      description: raw.description.trim(),
      quantity: raw.quantity,
      unitPriceMinor: raw.unitPriceMinor,
      discountPercent,
      discountMinor: fixedDiscount,
      lineGrossMinor,
      lineDiscountTotalMinor,
      lineNetMinor,
      lineTaxMinor,
      lineTotalMinor,
      taxBreakdown,
      serviceId: raw.serviceId ?? null,
      catalogItemId: raw.catalogItemId ?? null,
      unit: raw.unit?.trim() || undefined,
    };
  });

  const discountTotalMinor = lines.reduce((sum, line) => sum + line.lineDiscountTotalMinor, 0);
  let taxableMinor = lines.reduce((sum, line) => sum + line.lineNetMinor, 0);

  const docDiscountPercent = input.documentDiscountPercent ?? 0;
  if (docDiscountPercent < 0 || docDiscountPercent > 100) {
    throw new BadRequestError('documentDiscountPercent must be 0–100');
  }
  const docDiscountFixed = input.documentDiscountMinor ?? 0;
  assertMinor(docDiscountFixed, 'documentDiscountMinor');

  const docPercentDiscount = percentOfMinor(taxableMinor, docDiscountPercent);
  const documentDiscountApplied = Math.min(
    taxableMinor,
    addMinor(docPercentDiscount, docDiscountFixed),
  );
  taxableMinor -= documentDiscountApplied;

  // Recalculate document-level tax when exclusive and document discount applied
  let taxMinor = lines.reduce((sum, line) => sum + line.lineTaxMinor, 0);
  const taxBreakdownMap = new Map<string, { name: string; percent: number; amountMinor: number }>();

  if (mode === 'exclusive' && documentDiscountApplied > 0 && rates.length) {
    taxMinor = 0;
    for (const rate of rates) {
      const amountMinor = percentOfMinor(taxableMinor, rate.percent);
      taxBreakdownMap.set(rate.name, { name: rate.name, percent: rate.percent, amountMinor });
      taxMinor += amountMinor;
    }
  } else {
    for (const line of lines) {
      for (const part of line.taxBreakdown) {
        const existing = taxBreakdownMap.get(part.name);
        if (existing) existing.amountMinor += part.amountMinor;
        else taxBreakdownMap.set(part.name, { ...part });
      }
    }
  }

  const subtotalMinor = taxableMinor;
  const grandTotalMinor =
    mode === 'inclusive'
      ? addMinor(subtotalMinor, taxMinor) // inclusive: tax already extracted; grand = net + tax = original after discounts
      : mode === 'none'
        ? subtotalMinor
        : addMinor(subtotalMinor, taxMinor);

  // For inclusive without document discount, grand should equal sum of line totals
  const inclusiveGrand =
    mode === 'inclusive' && documentDiscountApplied === 0
      ? lines.reduce((sum, line) => sum + line.lineTotalMinor, 0)
      : grandTotalMinor;

  return {
    currency,
    subtotalMinor,
    discountTotalMinor: addMinor(discountTotalMinor, documentDiscountApplied),
    taxableMinor: subtotalMinor,
    taxMinor,
    grandTotalMinor: mode === 'inclusive' ? inclusiveGrand : grandTotalMinor,
    taxBreakdown: [...taxBreakdownMap.values()],
    lines,
  };
}
