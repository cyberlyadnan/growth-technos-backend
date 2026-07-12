import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import type { LeadEventHandler } from '../lead-events.types';

/**
 * Server-side analytics stub — Measurement Protocol / Segment later.
 * Always records a structured log for observability.
 * Optional LEAD_ANALYTICS_WEBHOOK_URL for forwarding.
 */
export const analyticsLeadHandler: LeadEventHandler = async (payload) => {
  loggers.api.info('Lead analytics event', {
    event: 'lead_submit',
    leadId: payload.leadId,
    formSlug: payload.formSlug,
    industry: payload.industry,
    service: payload.serviceInterested,
    source: payload.source,
    utmCampaign: payload.utm?.utmCampaign,
    landingPage: payload.landingPage,
  });

  const webhook = process.env.LEAD_ANALYTICS_WEBHOOK_URL?.trim();
  if (!webhook) {
    return {
      type: LeadEventType.ANALYTICS,
      ok: true,
      detail: 'logged',
    };
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        event: 'lead_submit',
        ...payload,
      }),
    });

    if (!response.ok) {
      return {
        type: LeadEventType.ANALYTICS,
        ok: false,
        detail: `webhook_status_${response.status}`,
      };
    }

    return { type: LeadEventType.ANALYTICS, ok: true, detail: 'logged_and_forwarded' };
  } catch (error) {
    loggers.api.error('Lead analytics webhook failed', {
      leadId: payload.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { type: LeadEventType.ANALYTICS, ok: false, detail: 'webhook_failed' };
  }
};
