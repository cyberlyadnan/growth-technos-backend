import PDFDocument from 'pdfkit';
import { formatMoney, type CurrencyCode } from '@core/utils/money';
import type { IAgencyInvoice } from '../model/invoice.model';

/**
 * Client-facing invoice PDF — never includes internalNotes.
 */
export async function buildInvoicePdfBuffer(invoice: IAgencyInvoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const currency = (invoice.currency as CurrencyCode) ?? 'INR';
    const brand = '#0F766E';
    const snap = invoice.billingSnapshot;
    const kindLabel = invoice.kind === 'credit_note' ? 'Credit Note' : 'Tax Invoice';

    doc.fillColor(brand).fontSize(20).text('Growth Technos');
    doc.fillColor('#334155').fontSize(9).text('Digital Growth Agency · Billing');
    doc.moveDown(0.5);
    doc.strokeColor(brand).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor('#0f172a').fontSize(16).text(kindLabel);
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Number: ${invoice.code}`);
    doc.text(`Status: ${String(invoice.status).toUpperCase()}`);
    if (invoice.issueDate) doc.text(`Issue date: ${invoice.issueDate.toISOString().slice(0, 10)}`);
    if (invoice.dueDate) doc.text(`Due date: ${invoice.dueDate.toISOString().slice(0, 10)}`);
    doc.moveDown(0.8);

    doc.fillColor('#0f172a').fontSize(11).text('Bill to');
    doc.fillColor('#334155').fontSize(10);
    if (snap) {
      doc.text(snap.legalName || snap.clientName);
      if (snap.clientCode) doc.text(`Client ID: ${snap.clientCode}`);
      if (snap.taxId) doc.text(`Tax ID / GSTIN: ${snap.taxId}`);
      if (snap.email) doc.text(snap.email);
      if (snap.phone) doc.text(snap.phone);
      const addr = snap.billingAddress;
      if (addr) {
        const line = [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country]
          .filter(Boolean)
          .join(', ');
        if (line) doc.text(line);
      }
    }
    doc.moveDown(0.8);

    if (invoice.taxConfig?.treatment) {
      doc.fillColor('#64748b').fontSize(8).text(
        `Tax treatment: ${invoice.taxConfig.treatment.replace(/_/g, ' ')}` +
          (invoice.taxConfig.placeOfSupplyState
            ? ` · Place of supply: ${invoice.taxConfig.placeOfSupplyState}`
            : ''),
      );
      doc.moveDown(0.4);
    }

    const tableTop = doc.y;
    doc.fontSize(8).fillColor('#64748b');
    doc.text('Description', 50, tableTop, { width: 220 });
    doc.text('Qty', 280, tableTop, { width: 40 });
    doc.text('Unit', 325, tableTop, { width: 70 });
    doc.text('Amount', 420, tableTop, { width: 125, align: 'right' });
    doc.moveTo(50, tableTop + 12).lineTo(545, tableTop + 12).strokeColor('#cbd5e1').stroke();

    let y = tableTop + 18;
    doc.fillColor('#0f172a').fontSize(9);
    for (const line of invoice.lineItems ?? []) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.text(line.description, 50, y, { width: 220 });
      doc.text(String(line.quantity), 280, y, { width: 40 });
      doc.text(formatMoney(line.unitPriceMinor, currency), 325, y, { width: 70 });
      doc.text(formatMoney(line.lineTotalMinor, currency), 420, y, {
        width: 125,
        align: 'right',
      });
      y += 28;
    }

    doc.y = y + 8;
    const totalsX = 360;
    const writeTotal = (label: string, value: number, bold = false) => {
      doc.fontSize(bold ? 11 : 9).fillColor(bold ? '#0f172a' : '#475569');
      doc.text(label, totalsX, doc.y, { width: 90 });
      doc.text(formatMoney(value, currency), 450, doc.y - (bold ? 13 : 11), {
        width: 95,
        align: 'right',
      });
      doc.moveDown(0.35);
    };

    writeTotal('Subtotal', invoice.subtotalMinor);
    if (invoice.discountTotalMinor > 0) writeTotal('Discounts', invoice.discountTotalMinor);
    for (const part of invoice.taxBreakdown ?? []) {
      writeTotal(`${part.name} (${part.percent}%)`, part.amountMinor);
    }
    writeTotal('Grand total', invoice.grandTotalMinor, true);
    writeTotal('Paid', invoice.amountPaidMinor);
    if (invoice.amountCreditedMinor > 0) writeTotal('Credits', invoice.amountCreditedMinor);
    writeTotal('Balance due', invoice.balanceDueMinor, true);

    if (invoice.paymentTerms?.trim()) {
      doc.moveDown(0.8);
      doc.fillColor('#0f172a').fontSize(11).text('Payment terms');
      doc.fillColor('#334155').fontSize(9).text(invoice.paymentTerms, { width: 495 });
    }
    if (invoice.notes?.trim()) {
      doc.moveDown(0.6);
      doc.fillColor('#0f172a').fontSize(11).text('Notes');
      doc.fillColor('#334155').fontSize(9).text(invoice.notes, { width: 495 });
    }

    doc.moveDown(1.2);
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text('Growth Technos — growthtechnos.com · This document is confidential.', {
        align: 'center',
      });

    doc.end();
  });
}
