import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import { mailService } from '@core/mail/mail.service';
import type { LeadEventHandler } from '../lead-events.types';

/**
 * Email notification stub — sends internal alert when SMTP is configured.
 * Swap body/recipients for production templates later.
 */
export const emailLeadHandler: LeadEventHandler = async (payload) => {
  const notifyTo = process.env.LEAD_NOTIFY_EMAIL?.trim();

  if (!mailService.isConfigured() || !notifyTo) {
    loggers.api.info('Lead email event skipped (SMTP or LEAD_NOTIFY_EMAIL not set)', {
      leadId: payload.leadId,
    });
    return {
      type: LeadEventType.EMAIL,
      ok: true,
      skipped: true,
      detail: 'smtp_or_notify_email_not_configured',
    };
  }

  try {
    await mailService.send({
      to: notifyTo,
      subject: `New lead — ${payload.industry || payload.leadType || 'inquiry'}`,
      text: [
        `Lead ID: ${payload.leadId}`,
        `Name: ${payload.name || '—'}`,
        `Email: ${payload.email || '—'}`,
        `Phone: ${payload.phone || '—'}`,
        `Business: ${payload.businessName || '—'}`,
        `Industry: ${payload.industry || '—'}`,
        `Service: ${payload.serviceInterested || '—'}`,
        `Source: ${payload.source}`,
        `Landing: ${payload.landingPage || '—'}`,
        `Message: ${payload.message || '—'}`,
      ].join('\n'),
      html: `<p><strong>New lead</strong> (${payload.leadId})</p>
        <ul>
          <li>Name: ${escapeHtml(payload.name)}</li>
          <li>Email: ${escapeHtml(payload.email)}</li>
          <li>Phone: ${escapeHtml(payload.phone)}</li>
          <li>Industry: ${escapeHtml(payload.industry)}</li>
          <li>Service: ${escapeHtml(payload.serviceInterested)}</li>
        </ul>
        <p>${escapeHtml(payload.message)}</p>`,
    });

    return { type: LeadEventType.EMAIL, ok: true, detail: 'notify_sent' };
  } catch (error) {
    loggers.api.error('Lead email event failed', {
      leadId: payload.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { type: LeadEventType.EMAIL, ok: false, detail: 'send_failed' };
  }
};

function escapeHtml(value?: string): string {
  if (!value) return '—';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
