import PDFDocument from 'pdfkit';
import { formatMoney, type CurrencyCode } from '@core/utils/money';
import type { IAgencyReceipt } from '../model/receipt.model';

/**
 * Branded payment receipt — only generated for confirmed payments.
 */
export async function buildReceiptPdfBuffer(receipt: IAgencyReceipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const currency = (receipt.currency as CurrencyCode) ?? 'INR';
    const brand = '#0F766E';

    doc.fillColor(brand).fontSize(20).text('Growth Technos');
    doc.fillColor('#334155').fontSize(9).text('Payment Receipt');
    doc.moveDown(0.5);
    doc.strokeColor(brand).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor('#0f172a').fontSize(16).text('Official Receipt');
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Receipt No: ${receipt.code}`);
    doc.text(`Payment No: ${receipt.paymentCode}`);
    doc.text(`Date: ${receipt.paymentDate.toISOString().slice(0, 10)}`);
    doc.text(`Method: ${String(receipt.method).replace(/_/g, ' ')}`);
    if (receipt.transactionRef) doc.text(`Transaction ref: ${receipt.transactionRef}`);
    doc.moveDown(0.8);

    doc.fillColor('#0f172a').fontSize(11).text('Received from');
    doc.fillColor('#334155').fontSize(10);
    doc.text(receipt.clientName);
    if (receipt.clientCode) doc.text(`Client ID: ${receipt.clientCode}`);
    doc.moveDown(0.8);

    doc.fillColor('#0f172a').fontSize(14).text(formatMoney(receipt.amountMinor, currency));
    doc.fillColor('#64748b').fontSize(9).text('Amount received (confirmed)');
    doc.moveDown(0.8);

    if (receipt.invoiceRefs?.length) {
      doc.fillColor('#0f172a').fontSize(11).text('Applied to invoices');
      doc.moveDown(0.3);
      for (const ref of receipt.invoiceRefs) {
        doc
          .fillColor('#334155')
          .fontSize(9)
          .text(`${ref.invoiceCode} — ${formatMoney(ref.amountMinor, currency)}`);
      }
    } else {
      doc.fillColor('#64748b').fontSize(9).text('Advance / unallocated payment');
    }

    if (receipt.voidedAt) {
      doc.moveDown(1);
      doc.fillColor('#b91c1c').fontSize(10).text('VOIDED — this receipt is no longer valid.');
    }

    doc.moveDown(1.5);
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        'This receipt confirms funds received by Growth Technos. It is issued only for verified payments.',
        { align: 'center' },
      );

    doc.end();
  });
}
