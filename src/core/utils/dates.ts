/** Shared date helpers for Agency Management (UTC-safe formatting). */

export function toIsoDateString(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return date.toISOString();
}

export function toDateOnlyUtc(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return date.toISOString().slice(0, 10);
}

export function startOfUtcDay(value: Date = new Date()): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function endOfUtcDay(value: Date = new Date()): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999),
  );
}

export function isDateRangeValid(start?: Date | null, end?: Date | null): boolean {
  if (!start || !end) return true;
  return start.getTime() <= end.getTime();
}
