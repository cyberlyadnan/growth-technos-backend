import { LeadSource, LeadType } from '@core/constants/leads';
import { leadRows, leadSubject } from '@modules/leads/events/handlers/lead-format';
import { sheetsLeadHandler } from '@modules/leads/events/handlers/sheets.handler';
import { telegramLeadHandler } from '@modules/leads/events/handlers/telegram.handler';
import { confirmationEmailLeadHandler } from '@modules/leads/events/handlers/confirmation-email.handler';

const payload = {
  leadId: 'abc',
  name: 'Asha Verma',
  businessName: 'Verma Traders',
  email: 'asha@example.com',
  phone: '+91 90000 00000',
  serviceInterested: 'Inventory & Billing',
  projectBudget: '₹30k–75k',
  projectTimeline: 'Within 1 month',
  currentTools: ['Excel', 'Tally'],
  leadType: LeadType.PROCESS_AUDIT,
  source: LeadSource.WEBSITE,
  landingPage: 'https://www.growthtechnos.com/contact',
  utm: { utmSource: 'google', utmCampaign: 'erp' },
  occurredAt: '2026-11-07T10:00:00.000Z',
};

describe('lead notification formatting', () => {
  it('builds the subject as "New lead: company – solution – budget"', () => {
    expect(leadSubject(payload)).toBe('New lead: Verma Traders – Inventory & Billing – ₹30k–75k');
  });

  it('includes tools, page URL and UTMs in the rows', () => {
    const rows = Object.fromEntries(leadRows(payload));
    expect(rows['Current tools']).toBe('Excel, Tally');
    expect(rows.Page).toBe('https://www.growthtechnos.com/contact');
    expect(rows.UTM).toContain('source=google');
  });
});

describe('optional integrations skip cleanly when not configured', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.GOOGLE_SHEETS_ID;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.SMTP_HOST;
  });
  afterAll(() => {
    process.env = saved;
  });

  it('Sheets, Telegram and confirmation email report skipped, not failed', async () => {
    await expect(sheetsLeadHandler(payload)).resolves.toMatchObject({ ok: true, skipped: true });
    await expect(telegramLeadHandler(payload)).resolves.toMatchObject({ ok: true, skipped: true });
    await expect(confirmationEmailLeadHandler(payload)).resolves.toMatchObject({ ok: true });
  });
});
