import PDFDocument from 'pdfkit';
import type { IProjectHandover } from '../model/handover.model';

/**
 * Branded handover PDF.
 * Never includes passwords, API keys, or other secrets.
 */
export async function buildHandoverPdfBuffer(
  handover: IProjectHandover,
  extras: { clientName?: string; projectName?: string; projectCode?: string },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const brand = '#0F766E';
    doc.fillColor(brand).fontSize(20).text('Growth Technos');
    doc.fillColor('#334155').fontSize(9).text('Project Handover Report');
    doc.moveDown(0.5);
    doc.strokeColor(brand).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor('#0f172a').fontSize(14).text(handover.title);
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Handover ID: ${handover.code}`);
    doc.text(`Status: ${handover.status.replace(/_/g, ' ').toUpperCase()}`);
    if (extras.clientName) doc.text(`Client: ${extras.clientName}`);
    if (extras.projectName) {
      doc.text(
        `Project: ${extras.projectName}${extras.projectCode ? ` (${extras.projectCode})` : ''}`,
      );
    }
    if (handover.completedAt) {
      doc.text(`Completed: ${handover.completedAt.toISOString().slice(0, 10)}`);
    }
    doc.moveDown(0.8);

    doc.fillColor('#0f172a').fontSize(12).text('Checklist');
    doc.moveDown(0.3);
    for (const item of handover.checklist ?? []) {
      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .text(`• ${item.label}`, { continued: false });
      doc
        .fillColor('#64748b')
        .fontSize(9)
        .text(
          `  Status: ${item.status}${item.responsiblePerson ? ` · Owner: ${item.responsiblePerson}` : ''}`,
        );
      if (item.notes) doc.text(`  Notes: ${item.notes}`);
      if (item.status === 'waived' && item.waivedReason) {
        doc.text(`  Waived: ${item.waivedReason}`);
      }
      if (item.status === 'blocked' && item.blockedReason) {
        doc.text(`  Blocked: ${item.blockedReason}`);
      }
      doc.moveDown(0.25);
    }

    doc.moveDown(0.5);
    doc.fillColor('#0f172a').fontSize(12).text('Terms & acceptance');
    doc.fillColor('#334155').fontSize(9);
    if (handover.warrantyTerms) {
      doc.text('Warranty:');
      doc.text(handover.warrantyTerms);
      doc.moveDown(0.3);
    }
    if (handover.maintenanceTerms) {
      doc.text('Maintenance:');
      doc.text(handover.maintenanceTerms);
      doc.moveDown(0.3);
    }
    if (handover.clientAcceptanceNotes) {
      doc.text('Client acceptance:');
      doc.text(handover.clientAcceptanceNotes);
      doc.moveDown(0.3);
    }

    doc.moveDown(0.5);
    doc.fillColor('#b45309').fontSize(9).text('Credential transfer');
    doc.fillColor('#78716c').fontSize(8);
    doc.text(
      handover.credentialTransferNotes?.trim() ||
        'Secrets are transferred via the secure credentials vault with reveal audit — never printed in this report.',
    );
    doc.moveDown(0.4);
    doc
      .fillColor('#991b1b')
      .fontSize(8)
      .text(
        'This document intentionally excludes passwords, API keys, and access tokens.',
      );

    doc.end();
  });
}
