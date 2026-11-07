import { auth as googleAuth, sheets as googleSheets } from '@googleapis/sheets';
import { LeadEventType } from '@core/constants/leads';
import { loggers } from '@core/logger';
import type { LeadEventHandler } from '../lead-events.types';
import { leadRows } from './lead-format';

/**
 * Step 2: append one row per lead to a Google Sheet using a service account.
 * Env: GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
 * (optional GOOGLE_SHEETS_TAB, default "Leads"). See docs/LEADS_SETUP.md in the website repo.
 */
export const sheetsLeadHandler: LeadEventHandler = async (payload) => {
  const sheetId = process.env.GOOGLE_SHEETS_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  // Keys pasted into .env usually contain literal "\n"; turn them back into newlines.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  const tab = process.env.GOOGLE_SHEETS_TAB?.trim() || 'Leads';

  if (!sheetId || !clientEmail || !privateKey) {
    loggers.api.info('Lead Sheets event skipped (Google Sheets env not set)', {
      leadId: payload.leadId,
    });
    return { type: LeadEventType.SHEETS, ok: true, skipped: true, detail: 'sheets_not_configured' };
  }

  try {
    const client = new googleAuth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const api = googleSheets({ version: 'v4', auth: client });
    const rows = leadRows(payload);
    const range = `${tab}!A1`;

    // Write the header row once, when the sheet is empty.
    const existing = await api.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tab}!A1:A1`,
    });
    if (!existing.data.values?.length) {
      await api.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values: [rows.map(([label]) => label)] },
      });
    }

    await api.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rows.map(([, value]) => value)] },
    });

    return { type: LeadEventType.SHEETS, ok: true, detail: 'row_appended' };
  } catch (error) {
    loggers.api.error('Lead Sheets event failed', {
      leadId: payload.leadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { type: LeadEventType.SHEETS, ok: false, detail: 'append_failed' };
  }
};
