import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import { analyticsLeadHandler } from './handlers/analytics.handler';
import { crmLeadHandler } from './handlers/crm.handler';
import { confirmationEmailLeadHandler } from './handlers/confirmation-email.handler';
import { emailLeadHandler } from './handlers/email.handler';
import { sheetsLeadHandler } from './handlers/sheets.handler';
import { telegramLeadHandler } from './handlers/telegram.handler';
import { whatsappLeadHandler } from './handlers/whatsapp.handler';
import type {
  LeadEventDispatchResult,
  LeadEventHandler,
  LeadSubmittedPayload,
} from './lead-events.types';

/**
 * Order after the MongoDB save: Google Sheets → notification email → confirmation email →
 * Telegram, then the optional webhooks. Steps run one after another, and each one is
 * isolated: a failure is logged and the next step still runs.
 */
const DEFAULT_HANDLERS: LeadEventHandler[] = [
  sheetsLeadHandler,
  emailLeadHandler,
  confirmationEmailLeadHandler,
  telegramLeadHandler,
  whatsappLeadHandler,
  crmLeadHandler,
  analyticsLeadHandler,
];

/**
 * Fan-out lead.submitted to integration handlers.
 * Failures are isolated — one broken provider does not block others.
 * Successful (or intentionally skipped) handlers are recorded on the Lead.
 */
export async function dispatchLeadSubmittedEvents(
  payload: LeadSubmittedPayload,
  handlers: LeadEventHandler[] = DEFAULT_HANDLERS,
): Promise<LeadEventDispatchResult> {
  const results = [];
  for (const handler of handlers) {
    try {
      results.push(await handler(payload));
    } catch (error) {
      loggers.api.error('Lead event handler threw', {
        leadId: payload.leadId,
        handler: handler.name,
        error: error instanceof Error ? error.message : String(error),
      });
      results.push({
        type: LeadEventType.ANALYTICS,
        ok: false,
        detail: 'handler_threw',
      });
    }
  }

  const triggered = results
    .filter((result) => result.ok)
    .map((result) => result.type)
    // unique
    .filter((type, index, list) => list.indexOf(type) === index);

  loggers.api.info('Lead events dispatched', {
    leadId: payload.leadId,
    triggered,
    results: results.map((r) => ({ type: r.type, ok: r.ok, skipped: r.skipped, detail: r.detail })),
  });

  return { triggered, results };
}

export type { LeadEventHandler, LeadSubmittedPayload, LeadEventDispatchResult };
