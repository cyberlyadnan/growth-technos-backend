import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import { mailService } from '@core/mail/mail.service';
import type { LeadEventHandler } from '../lead-events.types';
import { escapeHtml } from './lead-format';

/**
 * Step 4: short, plain confirmation to the person who filled the form.
 * Sent from EMAIL_FROM (set it to info@growthtechnos.com). Skipped when there is no email.
 */
export const confirmationEmailLeadHandler: LeadEventHandler = async (payload) => {
  if (process.env.LEAD_CONFIRMATION_EMAIL_ENABLED === 'false') {
    return { type: LeadEventType.CONFIRMATION_EMAIL, ok: true, skipped: true, detail: 'disabled' };
  }
  if (!payload.email) {
    return { type: LeadEventType.CONFIRMATION_EMAIL, ok: true, skipped: true, detail: 'no_email' };
  }
  if (!mailService.isConfigured()) {
    loggers.api.info('Lead confirmation email skipped (SMTP not set)', { leadId: payload.leadId });
    return {
      type: LeadEventType.CONFIRMATION_EMAIL,
      ok: true,
      skipped: true,
      detail: 'smtp_not_configured',
    };
  }

  const firstName = (payload.name ?? '').trim().split(/\s+/)[0] || 'there';
  const whatsapp = process.env.LEAD_CONFIRMATION_WHATSAPP?.trim() || '+91 97568 96250';
  const lines = [
    `Hi ${firstName},`,
    '',
    'Thanks for asking for a free process audit. We have your details.',
    '',
    'We will reply within one business day. We will ask a few questions about how your business runs today, then suggest what software would save your team the most time.',
    '',
    `If it is urgent, message us on WhatsApp at ${whatsapp}.`,
    '',
    'Saad',
    'Growth Technos',
    'www.growthtechnos.com',
  ];

  try {
    await mailService.send({
      to: payload.email,
      subject: 'We got your request for a free process audit',
      replyTo: process.env.LEAD_NOTIFY_EMAIL?.trim() || undefined,
      text: lines.join('\n'),
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">${lines
        .map((line) => (line ? `<p style="margin:0 0 4px">${escapeHtml(line)}</p>` : '<br/>'))
        .join('')}</div>`,
    });
    return { type: LeadEventType.CONFIRMATION_EMAIL, ok: true, detail: 'confirmation_sent' };
  } catch (error) {
    loggers.api.error('Lead confirmation email failed', {
      leadId: payload.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { type: LeadEventType.CONFIRMATION_EMAIL, ok: false, detail: 'send_failed' };
  }
};
