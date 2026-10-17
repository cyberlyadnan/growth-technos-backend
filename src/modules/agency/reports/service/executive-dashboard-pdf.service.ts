import PDFDocument from 'pdfkit';
import { formatMoney, type CurrencyCode } from '@core/utils/money';

export type ExecutiveDashboardPdfInput = {
  currency: CurrencyCode;
  generatedAt: string;
  filters: {
    from?: string | null;
    to?: string | null;
    clientId?: string | null;
    projectId?: string | null;
  };
  operations: {
    activeClients: number;
    projectsActive: number;
    projectsCompleted: number;
    projectsOverdue: number;
    quotationsAwaitingDecision: number;
  };
  finance: {
    invoicedRevenueMinor: number;
    confirmedPaymentsReceivedMinor: number;
    netCashReceivedMinor: number;
    outstandingReceivablesMinor: number;
    overdueBalanceMinor: number;
    recordedExpensesMinor: number;
    grossMarginInvoiceBasisMinor: number;
    refundsMinor: number;
  };
  methodologyNote: string;
};

/**
 * Branded executive snapshot PDF — actual totals only, no secrets.
 */
export async function buildExecutiveDashboardPdfBuffer(
  input: ExecutiveDashboardPdfInput,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const brand = '#0F766E';
    const money = (minor: number) => formatMoney(minor, input.currency);

    doc.fillColor(brand).fontSize(20).text('Growth Technos');
    doc.fillColor('#334155').fontSize(9).text('Executive Agency Management Snapshot');
    doc.moveDown(0.4);
    doc.strokeColor(brand).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.8);

    doc.fillColor('#475569').fontSize(9);
    doc.text(`Generated: ${input.generatedAt.slice(0, 19).replace('T', ' ')} UTC`);
    doc.text(`Currency: ${input.currency}`);
    if (input.filters.from || input.filters.to) {
      doc.text(
        `Date range: ${input.filters.from?.slice(0, 10) ?? '…'} → ${input.filters.to?.slice(0, 10) ?? '…'}`,
      );
    }
    doc.moveDown(0.8);

    doc.fillColor('#0f172a').fontSize(12).text('Operations');
    doc.fillColor('#334155').fontSize(10);
    doc.text(`Active clients: ${input.operations.activeClients}`);
    doc.text(
      `Projects — active: ${input.operations.projectsActive}, completed: ${input.operations.projectsCompleted}, overdue: ${input.operations.projectsOverdue}`,
    );
    doc.text(`Quotations awaiting decision: ${input.operations.quotationsAwaitingDecision}`);
    doc.moveDown(0.8);

    doc.fillColor('#0f172a').fontSize(12).text('Finance (actuals)');
    doc.fillColor('#334155').fontSize(10);
    doc.text(`Invoiced revenue (net of credit notes): ${money(input.finance.invoicedRevenueMinor)}`);
    doc.text(`Confirmed payments received: ${money(input.finance.confirmedPaymentsReceivedMinor)}`);
    doc.text(`Refunds: ${money(input.finance.refundsMinor)}`);
    doc.text(`Net cash received: ${money(input.finance.netCashReceivedMinor)}`);
    doc.text(`Outstanding receivables: ${money(input.finance.outstandingReceivablesMinor)}`);
    doc.text(`Overdue receivables: ${money(input.finance.overdueBalanceMinor)}`);
    doc.text(`Recorded expenses: ${money(input.finance.recordedExpensesMinor)}`);
    doc.text(
      `Gross margin (invoice basis): ${money(input.finance.grossMarginInvoiceBasisMinor)}`,
    );
    doc.moveDown(0.8);

    doc.fillColor('#64748b').fontSize(8).text(input.methodologyNote, { width: 495 });
    doc.moveDown(0.4);
    doc
      .fillColor('#991b1b')
      .fontSize(8)
      .text(
        'Invoiced ≠ collected. Gross margin is invoice-basis (not cash profit). Partial payments and advances are reflected via allocations and balanceDueMinor — never double-counted.',
      );

    doc.end();
  });
}
