/**
 * Money helpers for Agency Management System.
 * Store amounts as integer minor units (paise for INR) to avoid float drift.
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export const DEFAULT_AGENCY_CURRENCY: CurrencyCode = 'INR';

const CURRENCY_FRACTION_DIGITS: Record<CurrencyCode, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
};

export function currencyFractionDigits(currency: CurrencyCode = DEFAULT_AGENCY_CURRENCY): number {
  return CURRENCY_FRACTION_DIGITS[currency] ?? 2;
}

export function toMinorUnits(
  major: number,
  currency: CurrencyCode = DEFAULT_AGENCY_CURRENCY,
): number {
  if (!Number.isFinite(major)) {
    throw new Error('Amount must be a finite number');
  }
  const digits = currencyFractionDigits(currency);
  const factor = 10 ** digits;
  return Math.round(major * factor);
}

export function fromMinorUnits(
  minor: number,
  currency: CurrencyCode = DEFAULT_AGENCY_CURRENCY,
): number {
  if (!Number.isFinite(minor) || !Number.isInteger(minor)) {
    throw new Error('Minor amount must be a finite integer');
  }
  const digits = currencyFractionDigits(currency);
  return minor / 10 ** digits;
}

export function addMinor(...amounts: number[]): number {
  return amounts.reduce((sum, value) => {
    if (!Number.isInteger(value)) throw new Error('Amounts must be integer minor units');
    return sum + value;
  }, 0);
}

export function subtractMinor(minuend: number, subtrahend: number): number {
  if (!Number.isInteger(minuend) || !Number.isInteger(subtrahend)) {
    throw new Error('Amounts must be integer minor units');
  }
  return minuend - subtrahend;
}

/** Percentage of minor amount; result rounded to nearest minor unit. */
export function percentOfMinor(amountMinor: number, percent: number): number {
  if (!Number.isInteger(amountMinor) || !Number.isFinite(percent)) {
    throw new Error('Invalid percent calculation inputs');
  }
  return Math.round((amountMinor * percent) / 100);
}

export function formatMoney(
  amountMinor: number,
  currency: CurrencyCode = DEFAULT_AGENCY_CURRENCY,
  locale = 'en-IN',
): string {
  const major = fromMinorUnits(amountMinor, currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currencyFractionDigits(currency),
    maximumFractionDigits: currencyFractionDigits(currency),
  }).format(major);
}
