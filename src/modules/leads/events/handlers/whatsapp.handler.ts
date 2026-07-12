import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import type { LeadEventHandler } from '../lead-events.types';

/**
 * WhatsApp notification stub — ready for Meta Cloud API / BSP later.
 * Set LEAD_WHATSAPP_WEBHOOK_URL to POST a JSON payload when available.
 */
export const whatsappLeadHandler: LeadEventHandler = async (payload) => {
  const webhook = process.env.LEAD_WHATSAPP_WEBHOOK_URL?.trim();

  if (!webhook) {
    loggers.api.info('Lead WhatsApp event skipped (LEAD_WHATSAPP_WEBHOOK_URL not set)', {
      leadId: payload.leadId,
    });
    return {
      type: LeadEventType.WHATSAPP,
      ok: true,
      skipped: true,
      detail: 'webhook_not_configured',
    };
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        event: 'lead.submitted',
        channel: 'whatsapp',
        leadId: payload.leadId,
        phone: payload.whatsapp || payload.phone,
        name: payload.name,
        industry: payload.industry,
        message: payload.message,
      }),
    });

    if (!response.ok) {
      return {
        type: LeadEventType.WHATSAPP,
        ok: false,
        detail: `webhook_status_${response.status}`,
      };
    }

    return { type: LeadEventType.WHATSAPP, ok: true, detail: 'webhook_posted' };
  } catch (error) {
    loggers.api.error('Lead WhatsApp event failed', {
      leadId: payload.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { type: LeadEventType.WHATSAPP, ok: false, detail: 'webhook_failed' };
  }
};
