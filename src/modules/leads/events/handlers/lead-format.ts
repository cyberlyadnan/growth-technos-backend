import type { LeadSubmittedPayload } from '../lead-events.types';

/** Human-readable rows shared by the Sheet, the email and Telegram. */
export function leadRows(payload: LeadSubmittedPayload): Array<[string, string]> {
  const utm = payload.utm ?? {};
  const utmText = [
    utm.utmSource && `source=${utm.utmSource}`,
    utm.utmMedium && `medium=${utm.utmMedium}`,
    utm.utmCampaign && `campaign=${utm.utmCampaign}`,
    utm.utmTerm && `term=${utm.utmTerm}`,
    utm.utmContent && `content=${utm.utmContent}`,
  ]
    .filter(Boolean)
    .join(', ');

  return [
    ['Name', payload.name ?? ''],
    ['Company', payload.businessName ?? ''],
    ['Phone / WhatsApp', payload.phone || payload.whatsapp || ''],
    ['Email', payload.email ?? ''],
    ['Industry', payload.industry ?? ''],
    ['What they need', payload.serviceInterested ?? ''],
    ['Budget', payload.projectBudget || payload.monthlyBudget || ''],
    ['Timeline', payload.projectTimeline ?? ''],
    ['Current tools', (payload.currentTools ?? []).join(', ')],
    ['Message', payload.message ?? ''],
    ['Page', payload.landingPage ?? ''],
    ['Referrer', payload.referrer ?? ''],
    ['UTM', utmText],
    ['Submitted at', payload.clientSubmittedAt ?? payload.occurredAt],
    ['Lead ID', payload.leadId],
    ['Saved to database', payload.savedToDatabase === false ? 'NO (check server logs)' : 'yes'],
  ];
}

export function escapeHtml(value?: string): string {
  if (!value) return '-';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "New lead: {company} – {solution} – {budget}" */
export function leadSubject(payload: LeadSubmittedPayload): string {
  const company = payload.businessName || payload.name || 'Unknown company';
  const solution = payload.serviceInterested || 'Not specified';
  const budget = payload.projectBudget || payload.monthlyBudget || 'Budget not given';
  return `New lead: ${company} – ${solution} – ${budget}`;
}
