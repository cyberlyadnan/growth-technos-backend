import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import type { LeadEventHandler } from '../lead-events.types';

/**
 * CRM sync stub — HubSpot / Salesforce / custom CRM webhook later.
 * Set LEAD_CRM_WEBHOOK_URL to forward the lead payload.
 */
export const crmLeadHandler: LeadEventHandler = async (payload) => {
  const webhook = process.env.LEAD_CRM_WEBHOOK_URL?.trim();

  if (!webhook) {
    loggers.api.info('Lead CRM event skipped (LEAD_CRM_WEBHOOK_URL not set)', {
      leadId: payload.leadId,
    });
    return {
      type: LeadEventType.CRM,
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
        channel: 'crm',
        ...payload,
      }),
    });

    if (!response.ok) {
      return { type: LeadEventType.CRM, ok: false, detail: `webhook_status_${response.status}` };
    }

    return { type: LeadEventType.CRM, ok: true, detail: 'webhook_posted' };
  } catch (error) {
    loggers.api.error('Lead CRM event failed', {
      leadId: payload.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { type: LeadEventType.CRM, ok: false, detail: 'webhook_failed' };
  }
};
