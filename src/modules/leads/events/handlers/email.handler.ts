import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import { mailService } from '@core/mail/mail.service';
import type { LeadEventHandler } from '../lead-events.types';
import { escapeHtml, leadRows, leadSubject } from './lead-format';

/**
 * Step 3: notification email to the owner (LEAD_NOTIFY_EMAIL) with every form field,
 * the page URL and UTMs. Subject: "New lead: {company} – {solution} – {budget}".
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

  const rows = leadRows(payload);
  try {
    await mailService.send({
      to: notifyTo,
      subject: leadSubject(payload),
      replyTo: payload.email || undefined,
      text: rows.map(([label, value]) => `${label}: ${value || '-'}`).join('\n'),
      html: `<h2 style="font-family:Arial,sans-serif">New lead from the website</h2>
        <table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
          ${rows
            .map(
              ([label, value]) =>
                `<tr><td style="color:#555;vertical-align:top;white-space:nowrap"><strong>${escapeHtml(
                  label,
                )}</strong></td><td>${escapeHtml(value)}</td></tr>`,
            )
            .join('')}
        </table>`,
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
