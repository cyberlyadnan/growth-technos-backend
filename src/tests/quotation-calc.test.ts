import { calculateQuotationTotals } from '@modules/agency/quotations/service/quotation-calc';

describe('quotation calculation engine', () => {
  it('computes exclusive GST on line items with discounts', () => {
    const totals = calculateQuotationTotals({
      currency: 'INR',
      taxConfig: { mode: 'exclusive', rates: [{ name: 'GST', percent: 18 }] },
      lineItems: [
        {
          description: 'Website design',
          quantity: 1,
          unitPriceMinor: 10000000, // 100,000.00
          discountPercent: 10,
        },
        {
          description: 'Hosting setup',
          quantity: 2,
          unitPriceMinor: 500000, // 5,000.00 each
        },
      ],
    });

    // Line1: 100000 - 10% = 90000 major → 9000000 minor; tax 18% = 1620000
    // Line2: 2*5000 = 10000 major → 1000000; tax 180000
    expect(totals.subtotalMinor).toBe(10000000);
    expect(totals.taxMinor).toBe(1800000);
    expect(totals.grandTotalMinor).toBe(11800000);
    expect(totals.discountTotalMinor).toBe(1000000);
  });

  it('supports tax-none mode', () => {
    const totals = calculateQuotationTotals({
      taxConfig: { mode: 'none', rates: [{ name: 'GST', percent: 18 }] },
      lineItems: [{ description: 'Consulting', quantity: 1, unitPriceMinor: 250000 }],
    });
    expect(totals.taxMinor).toBe(0);
    expect(totals.grandTotalMinor).toBe(250000);
  });

  it('extracts inclusive tax without trusting client totals', () => {
    const totals = calculateQuotationTotals({
      taxConfig: { mode: 'inclusive', rates: [{ name: 'GST', percent: 18 }] },
      lineItems: [{ description: 'Retainer', quantity: 1, unitPriceMinor: 118000 }],
    });
    expect(totals.grandTotalMinor).toBe(118000);
    expect(totals.subtotalMinor).toBeGreaterThan(0);
    expect(totals.taxMinor).toBeGreaterThan(0);
    expect(totals.subtotalMinor + totals.taxMinor).toBe(118000);
  });

  it('rejects invalid money inputs', () => {
    expect(() =>
      calculateQuotationTotals({
        taxConfig: { mode: 'exclusive', rates: [] },
        lineItems: [{ description: 'Bad', quantity: 1, unitPriceMinor: 10.5 }],
      }),
    ).toThrow(/minor units/i);
  });
});
