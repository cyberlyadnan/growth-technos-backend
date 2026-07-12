import { LeadEventType, LeadSource, LeadType } from '@core/constants/leads';
import { dispatchLeadSubmittedEvents } from '@modules/leads/events';
import type { LeadEventHandler, LeadSubmittedPayload } from '@modules/leads/events';

const basePayload: LeadSubmittedPayload = {
  leadId: '507f1f77bcf86cd799439011',
  formSlug: 'contact',
  name: 'Test User',
  email: 'test@example.com',
  leadType: LeadType.CONTACT_FORM,
  source: LeadSource.WEBSITE,
  occurredAt: new Date().toISOString(),
};

describe('dispatchLeadSubmittedEvents', () => {
  it('records successful handler types and isolates failures', async () => {
    const okHandler: LeadEventHandler = async () => ({
      type: LeadEventType.ANALYTICS,
      ok: true,
      detail: 'logged',
    });
    const failHandler: LeadEventHandler = async () => ({
      type: LeadEventType.CRM,
      ok: false,
      detail: 'down',
    });
    const throwHandler: LeadEventHandler = async () => {
      throw new Error('boom');
    };
    const emailHandler: LeadEventHandler = async () => ({
      type: LeadEventType.EMAIL,
      ok: true,
      skipped: true,
    });

    const result = await dispatchLeadSubmittedEvents(basePayload, [
      okHandler,
      failHandler,
      throwHandler,
      emailHandler,
    ]);

    expect(result.triggered).toEqual(
      expect.arrayContaining([LeadEventType.ANALYTICS, LeadEventType.EMAIL]),
    );
    expect(result.triggered).not.toContain(LeadEventType.CRM);
    expect(result.results).toHaveLength(4);
    expect(result.results.some((r) => r.ok === false)).toBe(true);
  });

  it('runs default handlers without throwing when webhooks are unset', async () => {
    delete process.env.LEAD_NOTIFY_EMAIL;
    delete process.env.LEAD_WHATSAPP_WEBHOOK_URL;
    delete process.env.LEAD_CRM_WEBHOOK_URL;
    delete process.env.LEAD_ANALYTICS_WEBHOOK_URL;

    const result = await dispatchLeadSubmittedEvents(basePayload);
    expect(result.results.length).toBeGreaterThanOrEqual(4);
    expect(result.triggered).toContain(LeadEventType.ANALYTICS);
  });
});
