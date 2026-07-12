import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import { analyticsLeadHandler } from './handlers/analytics.handler';
import { crmLeadHandler } from './handlers/crm.handler';
import { emailLeadHandler } from './handlers/email.handler';
import { whatsappLeadHandler } from './handlers/whatsapp.handler';
import type {
  LeadEventDispatchResult,
  LeadEventHandler,
  LeadSubmittedPayload,
} from './lead-events.types';

const DEFAULT_HANDLERS: LeadEventHandler[] = [
  emailLeadHandler,
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
  const results = await Promise.all(
    handlers.map(async (handler) => {
      try {
        return await handler(payload);
      } catch (error) {
        loggers.api.error('Lead event handler threw', {
          leadId: payload.leadId,
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          type: LeadEventType.ANALYTICS,
          ok: false,
          detail: 'handler_threw',
        };
      }
    }),
  );

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

export type {
  LeadEventHandler,
  LeadSubmittedPayload,
  LeadEventDispatchResult,
};
