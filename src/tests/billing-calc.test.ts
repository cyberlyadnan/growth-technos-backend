import {
  buildTaxConfigFromIndianSettings,
  calculateInvoiceTotals,
} from '@modules/agency/billing/service/billing-calc';

describe('billing calculation & Indian tax settings', () => {
  it('builds CGST/SGST for intra-state treatment', () => {
    const config = buildTaxConfigFromIndianSettings({
      treatment: 'intra_state',
      gstPercent: 18,
      supplierState: 'KA',
      placeOfSupplyState: 'KA',
    });
    expect(config.mode).toBe('exclusive');
    expect(config.rates).toEqual([
      { name: 'CGST', percent: 9 },
      { name: 'SGST', percent: 9 },
    ]);
  });

  it('builds IGST for inter-state treatment', () => {
    const config = buildTaxConfigFromIndianSettings({
      treatment: 'inter_state',
      gstPercent: 18,
      supplierState: 'KA',
      placeOfSupplyState: 'MH',
    });
    expect(config.rates).toEqual([{ name: 'IGST', percent: 18 }]);
  });

  it('rejects mismatched place-of-supply rules', () => {
    expect(() =>
      buildTaxConfigFromIndianSettings({
        treatment: 'intra_state',
        gstPercent: 18,
        supplierState: 'KA',
        placeOfSupplyState: 'MH',
      }),
    ).toThrow(/match supplier state/i);
  });

  it('calculates exclusive totals authoritatively', () => {
    const taxConfig = buildTaxConfigFromIndianSettings({
      treatment: 'inter_state',
      gstPercent: 18,
    });
    const totals = calculateInvoiceTotals({
      taxConfig,
      lineItems: [{ description: 'Retainer', quantity: 1, unitPriceMinor: 100000 }],
    });
    expect(totals.subtotalMinor).toBe(100000);
    expect(totals.taxMinor).toBe(18000);
    expect(totals.grandTotalMinor).toBe(118000);
  });
});
