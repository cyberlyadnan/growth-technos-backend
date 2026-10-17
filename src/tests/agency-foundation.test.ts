import {
  addMinor,
  formatMoney,
  fromMinorUnits,
  percentOfMinor,
  subtractMinor,
  toMinorUnits,
} from '@core/utils/money';
import {
  formatAgencyDocumentNumber,
  getAgencyNumberingConfig,
} from '@core/utils/agency-identifiers';

describe('money utils', () => {
  it('converts major INR amounts to minor units without float drift', () => {
    expect(toMinorUnits(199.99, 'INR')).toBe(19999);
    expect(fromMinorUnits(19999, 'INR')).toBe(199.99);
  });

  it('adds and subtracts minor units', () => {
    expect(addMinor(1000, 250, 50)).toBe(1300);
    expect(subtractMinor(1300, 300)).toBe(1000);
  });

  it('computes percentage of minor amounts', () => {
    expect(percentOfMinor(10000, 18)).toBe(1800);
  });

  it('formats currency for display', () => {
    const formatted = formatMoney(100000, 'INR', 'en-IN');
    expect(formatted).toContain('1,000.00');
  });
});

describe('agency identifiers', () => {
  it('formats document numbers with year and padding', () => {
    const at = new Date(Date.UTC(2026, 0, 15));
    expect(formatAgencyDocumentNumber('invoice', 7, at)).toBe('GT-INV-2026-0007');
    expect(formatAgencyDocumentNumber('client', 1, at)).toBe('GT-CL-2026-0001');
  });

  it('exposes numbering configuration for all kinds', () => {
    const config = getAgencyNumberingConfig();
    expect(config.length).toBeGreaterThanOrEqual(7);
    expect(config.find((rule) => rule.kind === 'quotation')?.prefix).toBe('GT-QT');
  });

  it('rejects invalid sequences', () => {
    expect(() => formatAgencyDocumentNumber('receipt', 0)).toThrow(/positive integer/);
  });
});
