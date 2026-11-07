import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import type { LeadEventHandler } from '../lead-events.types';
import { leadRows, leadSubject } from './lead-format';

/**
 * Step 5 (optional): Telegram message. Skipped when TELEGRAM_BOT_TOKEN or
 * TELEGRAM_CHAT_ID is empty.
 */
export const telegramLeadHandler: LeadEventHandler = async (payload) => {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return {
      type: LeadEventType.TELEGRAM,
      ok: true,
      skipped: true,
      detail: 'telegram_not_configured',
    };
  }

  const text = [
    leadSubject(payload),
    '',
    ...leadRows(payload)
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`),
  ]
    .join('\n')
    .slice(0, 3900);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      loggers.api.error('Lead Telegram event failed', {
        leadId: payload.leadId,
        status: response.status,
      });
      return { type: LeadEventType.TELEGRAM, ok: false, detail: `status_${response.status}` };
    }
    return { type: LeadEventType.TELEGRAM, ok: true, detail: 'sent' };
  } catch (error) {
    loggers.api.error('Lead Telegram event failed', {
      leadId: payload.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { type: LeadEventType.TELEGRAM, ok: false, detail: 'request_failed' };
  }
};
