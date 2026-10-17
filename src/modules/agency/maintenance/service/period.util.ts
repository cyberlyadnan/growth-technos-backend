import type { BillingFrequency } from '../model/agreement.model';

export type PeriodWindow = {
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Compute the billing period containing `at` for the given frequency. */
export function periodForDate(
  frequency: BillingFrequency,
  at: Date,
  customIntervalDays?: number,
  anchorStart?: Date,
): PeriodWindow {
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth();

  if (frequency === 'monthly') {
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    return {
      periodKey: `${y}-${pad(m + 1)}`,
      periodStart: start,
      periodEnd: end,
    };
  }

  if (frequency === 'quarterly') {
    const q = Math.floor(m / 3) + 1;
    const startMonth = (q - 1) * 3;
    const start = new Date(Date.UTC(y, startMonth, 1));
    const end = new Date(Date.UTC(y, startMonth + 3, 0, 23, 59, 59, 999));
    return {
      periodKey: `${y}-Q${q}`,
      periodStart: start,
      periodEnd: end,
    };
  }

  if (frequency === 'annual') {
    const start = new Date(Date.UTC(y, 0, 1));
    const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    return {
      periodKey: `${y}`,
      periodStart: start,
      periodEnd: end,
    };
  }

  // custom — keyed by interval index from agreement start
  const days = customIntervalDays && customIntervalDays > 0 ? customIntervalDays : 30;
  const anchor = anchorStart ? new Date(anchorStart) : at;
  const anchorUtc = Date.UTC(
    anchor.getUTCFullYear(),
    anchor.getUTCMonth(),
    anchor.getUTCDate(),
  );
  const atUtc = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
  const diffDays = Math.floor((atUtc - anchorUtc) / (24 * 60 * 60 * 1000));
  const index = Math.max(0, Math.floor(diffDays / days));
  const start = new Date(anchorUtc + index * days * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000 - 1);
  return {
    periodKey: `C${index}-${start.toISOString().slice(0, 10)}`,
    periodStart: start,
    periodEnd: end,
  };
}

export function advanceNextBillingDate(
  frequency: BillingFrequency,
  from: Date,
  customIntervalDays?: number,
): Date {
  const d = new Date(from);
  if (frequency === 'monthly') {
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d;
  }
  if (frequency === 'quarterly') {
    d.setUTCMonth(d.getUTCMonth() + 3);
    return d;
  }
  if (frequency === 'annual') {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    return d;
  }
  const days = customIntervalDays && customIntervalDays > 0 ? customIntervalDays : 30;
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function deriveAgreementStatus(
  status: string,
  endDate?: Date | null,
  renewalDate?: Date | null,
): string {
  if (['terminated', 'cancelled', 'draft'].includes(status)) return status;
  const now = Date.now();
  const end = endDate?.getTime();
  if (end && end < now) return 'expired';
  const renew = renewalDate?.getTime() ?? end;
  const thirty = 30 * 24 * 60 * 60 * 1000;
  if (renew && renew - now <= thirty && renew >= now) return 'expiring_soon';
  return 'active';
}
