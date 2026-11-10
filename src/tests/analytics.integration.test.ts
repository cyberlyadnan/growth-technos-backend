import request from 'supertest';
import { LeadStatus } from '@core/constants/leads';
import { app, loginAsAdmin } from './helpers/http';
import { isMongoTestReady } from './helpers/mongo-gate';
import { Pageview } from '@modules/analytics/model/pageview.model';
import { Lead } from '@modules/leads/model/lead.model';
import { trackingSchema } from '@modules/analytics/validation/analytics.validation';
import { reportWindow } from '@modules/analytics/service/reporting';

const utm = {
  utmSource: 'google',
  utmMedium: 'organic',
  utmCampaign: 'gbp_product',
  utmContent: 'automation',
};
const event = {
  eventId: 'b08dad5f-dc33-4c9e-8ddc-14b534a3cc91',
  eventName: 'page_view',
  sessionId: 'sess_test123456',
  path: '/solutions/business-process-automation',
  utm,
  referrer: 'https://www.google.com/search?q=private',
};
beforeEach(() => {
  if (!isMongoTestReady())
    throw new Error(
      'Analytics integration verification requires a running in-memory MongoDB; no soft skip.',
    );
});

describe('real website measurement', () => {
  it('validates bounded public telemetry and strips unapproved fields and referrer queries', () => {
    const result = trackingSchema.parse({ ...event, email: 'private@example.com' });
    expect(result.referrer).toBe('https://www.google.com');
    expect(result).not.toHaveProperty('email');
    expect(trackingSchema.safeParse({ ...event, path: '/admin/leads' }).success).toBe(false);
    expect(trackingSchema.safeParse({ ...event, path: '//attacker.test' }).success).toBe(false);
    expect(trackingSchema.safeParse({ ...event, sessionId: { $ne: '' } }).success).toBe(false);
    expect(trackingSchema.safeParse({ ...event, eventName: 'generate_lead' }).success).toBe(false);
  });
  it('deduplicates retries and records no raw IP or user agent', async () => {
    await request(app).post('/api/v1/analytics/events').send(event).expect(201);
    await request(app).post('/api/v1/analytics/events').send(event).expect(201);
    const rows = await Pageview.find().lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].referrer).toBe('https://www.google.com');
    expect(rows[0]).not.toHaveProperty('ip');
    expect(rows[0]).not.toHaveProperty('userAgent');
  });
  it('requires authorization for reports and validates filters', async () => {
    await request(app).get('/api/v1/analytics/stats').expect(401);
    const agent = await loginAsAdmin();
    await agent.get('/api/v1/analytics/stats?days=999').expect(422);
  });
  it('reports real GBP sessions, server leads and blog engagement without invented metrics', async () => {
    await Pageview.create([
      { ...event, eventId: undefined },
      { ...event, eventId: undefined, path: '/contact' },
      { ...event, eventId: undefined, sessionId: 'sess_blog123456', path: '/blog/erp-cost' },
      {
        ...event,
        eventId: undefined,
        sessionId: 'sess_blog123456',
        path: '/blog/erp-cost',
        eventName: 'article_engaged',
      },
      { ...event, eventId: undefined, eventName: 'whatsapp_click' },
      { path: '/', sessionId: 'sess_direct123', referrer: '', eventName: 'page_view' },
    ]);
    await Lead.create({
      name: 'Asha',
      phone: '+919876543210',
      utm,
      status: LeadStatus.QUALIFIED,
      customFields: {
        analyticsSessionId: 'sess_blog123456',
        analyticsLandingPath: '/blog/erp-cost',
      },
    });
    const agent = await loginAsAdmin();
    const response = await agent.get('/api/v1/analytics/stats?days=7&channel=gbp').expect(200);
    const data = response.body.data;
    expect(data.totalVisits).toBe(3);
    expect(data.uniqueVisitors).toBe(2);
    expect(data.leads).toBe(1);
    expect(data.qualifiedLeads).toBe(1);
    expect(data.conversionRate).toBe(50);
    expect(data.whatsappClicks).toBe(1);
    expect(data.avgSessionDuration).toBeNull();
    expect(data.bounceRate).toBeNull();
    expect(data.visitorsData).toHaveLength(7);
    expect(data.campaigns[0]).toMatchObject({
      source: 'google',
      campaign: 'gbp_product',
      content: 'automation',
      sessions: 2,
      leads: 1,
    });
    expect(data.blogPerformance[0]).toMatchObject({
      path: '/blog/erp-cost',
      views: 1,
      engagedReads: 1,
      landingLeads: 1,
    });
    expect(data.topPages[0]).not.toHaveProperty('bounceRate');
  });
  it('groups sessions across the India midnight boundary correctly', () => {
    const { start } = reportWindow(7, new Date('2026-01-01T00:15:00+05:30'));
    expect(start.toISOString()).toBe('2025-12-25T18:30:00.000Z');
  });
});
