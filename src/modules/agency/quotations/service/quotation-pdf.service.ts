import PDFDocument from 'pdfkit';
import { formatMoney, type CurrencyCode } from '@core/utils/money';
import type { IAgencyQuotation } from '../model/quotation.model';

type PdfClient = {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  legalName?: string;
};

/**
 * Client-facing PDF — never includes internalNotes.
 */
export async function buildQuotationPdfBuffer(
  quotation: IAgencyQuotation,
  client: PdfClient,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const currency = (quotation.currency as CurrencyCode) ?? 'INR';
    const brand = '#0F766E';

    doc.fillColor(brand).fontSize(20).text('Growth Technos', { continued: false });
    doc
      .fillColor('#334155')
      .fontSize(9)
      .text('Digital Growth Agency · Quotations & Proposals', { continued: false });
    doc.moveDown(0.5);
    doc
      .strokeColor(brand)
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(1);

    doc.fillColor('#0f172a').fontSize(16).text(quotation.title || 'Quotation', { continued: false });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Quotation No: ${quotation.code}`);
    doc.text(`Version: ${quotation.version}`);
    doc.text(`Status: ${String(quotation.status).toUpperCase()}`);
    if (quotation.issueDate) {
      doc.text(`Issue date: ${quotation.issueDate.toISOString().slice(0, 10)}`);
    }
    if (quotation.expiryDate) {
      doc.text(`Valid until: ${quotation.expiryDate.toISOString().slice(0, 10)}`);
    }
    doc.moveDown(0.8);

    doc.fillColor('#0f172a').fontSize(11).text('Prepared for', { continued: false });
    doc.fillColor('#334155').fontSize(10);
    doc.text(client.legalName || client.name);
    if (client.code) doc.text(`Client ID: ${client.code}`);
    if (client.email) doc.text(client.email);
    if (client.phone) doc.text(client.phone);
    doc.moveDown(0.8);

    doc.fillColor('#0f172a').fontSize(11).text('Line items', { continued: false });
    doc.moveDown(0.3);

    const tableTop = doc.y;
    doc.fontSize(8).fillColor('#64748b');
    doc.text('Description', 50, tableTop, { width: 220 });
    doc.text('Qty', 280, tableTop, { width: 40 });
    doc.text('Unit', 325, tableTop, { width: 70 });
    doc.text('Amount', 420, tableTop, { width: 125, align: 'right' });
    doc
      .moveTo(50, tableTop + 12)
      .lineTo(545, tableTop + 12)
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .stroke();

    let y = tableTop + 18;
    doc.fillColor('#0f172a').fontSize(9);
    for (const line of quotation.lineItems ?? []) {
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
    doc
      .moveTo(320, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#cbd5e1')
      .stroke();
    doc.moveDown(0.5);

    const totalsX = 360;
    const writeTotal = (label: string, value: number, bold = false) => {
      doc.fontSize(bold ? 11 : 9).fillColor(bold ? '#0f172a' : '#475569');
      doc.text(label, totalsX, doc.y, { width: 80, continued: false });
      doc.text(formatMoney(value, currency), 450, doc.y - (bold ? 13 : 11), {
        width: 95,
        align: 'right',
      });
      doc.moveDown(0.35);
    };

    writeTotal('Subtotal', quotation.subtotalMinor);
    if (quotation.discountTotalMinor > 0) {
      writeTotal('Discounts', quotation.discountTotalMinor);
    }
    writeTotal('Tax', quotation.taxMinor);
    writeTotal('Grand total', quotation.grandTotalMinor, true);

    const sections: Array<[string, string | undefined]> = [
      ['Scope of work', quotation.scopeOfWork],
      ['Exclusions', quotation.exclusions],
      ['Assumptions', quotation.assumptions],
      ['Delivery timeline', quotation.deliveryTimeline],
      ['Payment milestones', quotation.paymentMilestones],
      ['Terms & conditions', quotation.terms],
    ];

    for (const [label, value] of sections) {
      if (!value?.trim()) continue;
      if (doc.y > 680) doc.addPage();
      doc.moveDown(0.6);
      doc.fillColor('#0f172a').fontSize(11).text(label);
      doc.fillColor('#334155').fontSize(9).text(value, { width: 495 });
    }

    doc.moveDown(1.2);
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        'This quotation is confidential and intended for the named client. Growth Technos — growthtechnos.com',
        { align: 'center' },
      );

    doc.end();
  });
}
