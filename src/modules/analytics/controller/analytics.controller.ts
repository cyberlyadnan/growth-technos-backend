import { Request, Response } from 'express';
import { Pageview } from '../model/pageview.model';
import { Lead } from '@modules/leads/model/lead.model';
import { asyncHandler, sendCreated, sendSuccess } from '@core/response';
import {
  gbpFields,
  groupPages,
  pageviewFilter,
  reportWindow,
  sourceExpression,
} from '../service/reporting';
import type { TrackingInput } from '../validation/analytics.validation';

export const trackPageview = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as TrackingInput;
  if (/bot|crawler|spider|headless/i.test(req.headers['user-agent'] || '')) {
    sendCreated(res, null, 'Tracking ignored');
    return;
  }
  try {
    // Wait for the unique event index before accepting concurrent deliveries.
    await Pageview.init();
    if (data.eventId)
      await Pageview.updateOne({ eventId: data.eventId }, { $setOnInsert: data }, { upsert: true });
    else await Pageview.create(data);
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  sendCreated(res, null, 'Event recorded');
});

export const getAnalyticsStats = asyncHandler(async (req: Request, res: Response) => {
  const days = Number(req.query.days ?? 30);
  const channel = req.query.channel ?? 'all';
  const { start, end } = reportWindow(days);
  const dateMatch = { $gte: start, $lte: end };
  const match = { createdAt: dateMatch, ...(channel === 'gbp' ? gbpFields('utm.') : {}) };
  const viewMatch = { ...match, ...pageviewFilter };
  const leadMatch = {
    leadType: { $nin: ['newsletter', 'career'] },
    createdAt: dateMatch,
    isDeleted: { $ne: true },
    ...(channel === 'gbp' ? gbpFields('utm.') : {}),
  };
  const [
    views,
    daily,
    sources,
    campaigns,
    pages,
    events,
    blogs,
    leadCounts,
    campaignLeads,
    blogLeads,
    conversion,
  ] = await Promise.all([
    Pageview.aggregate([
      { $match: viewMatch },
      { $group: { _id: null, views: { $sum: 1 }, sessions: { $addToSet: '$sessionId' } } },
      { $project: { views: 1, sessions: { $size: '$sessions' } } },
    ]),
    Pageview.aggregate([
      { $match: viewMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' },
          },
          visits: { $sum: 1 },
          sessions: { $addToSet: '$sessionId' },
        },
      },
      { $project: { _id: 0, date: '$_id', visits: 1, unique: { $size: '$sessions' } } },
      { $sort: { date: 1 } },
    ]),
    Pageview.aggregate([
      { $match: viewMatch },
      { $group: { _id: { session: '$sessionId', source: sourceExpression() } } },
      { $group: { _id: '$_id.source', value: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', value: 1 } },
      { $sort: { value: -1 } },
    ]),
    Pageview.aggregate([
      { $match: viewMatch },
      {
        $group: {
          _id: {
            source: '$utm.utmSource',
            medium: '$utm.utmMedium',
            campaign: '$utm.utmCampaign',
            content: '$utm.utmContent',
          },
          views: { $sum: 1 },
          sessions: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 0,
          source: { $ifNull: ['$_id.source', '(not set)'] },
          medium: { $ifNull: ['$_id.medium', '(not set)'] },
          campaign: { $ifNull: ['$_id.campaign', '(not set)'] },
          content: { $ifNull: ['$_id.content', '(not set)'] },
          views: 1,
          sessions: { $size: '$sessions' },
        },
      },
      { $sort: { sessions: -1 } },
      { $limit: 50 },
    ]),
    Pageview.aggregate([{ $match: viewMatch }, ...groupPages]),
    Pageview.aggregate([{ $match: match }, { $group: { _id: '$eventName', count: { $sum: 1 } } }]),
    Pageview.aggregate([
      { $match: { ...match, path: /^\/blog\/[^/]+$/ } },
      {
        $group: {
          _id: '$path',
          views: {
            $sum: {
              $cond: [{ $in: [{ $ifNull: ['$eventName', 'page_view'] }, ['page_view']] }, 1, 0],
            },
          },
          engagedReads: { $sum: { $cond: [{ $eq: ['$eventName', 'article_engaged'] }, 1, 0] } },
          completions: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$eventName', 'article_scroll'] }, { $eq: ['$scrollDepth', 100] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, path: '$_id', views: 1, engagedReads: 1, completions: 1 } },
    ]),
    Lead.aggregate([
      { $match: leadMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          qualified: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['qualified', 'meeting_scheduled', 'proposal', 'negotiation', 'won'],
                  ],
                },
                1,
                0,
              ],
            },
          },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
        },
      },
    ]),
    Lead.aggregate([
      { $match: leadMatch },
      {
        $group: {
          _id: {
            source: '$utm.utmSource',
            medium: '$utm.utmMedium',
            campaign: '$utm.utmCampaign',
            content: '$utm.utmContent',
          },
          leads: { $sum: 1 },
        },
      },
    ]),
    Lead.aggregate([
      { $match: { ...leadMatch, 'customFields.analyticsLandingPath': /^\/blog\/[^/]+$/ } },
      { $group: { _id: '$customFields.analyticsLandingPath', leads: { $sum: 1 } } },
    ]),
    Pageview.aggregate([
      { $match: viewMatch },
      { $group: { _id: '$sessionId' } },
      {
        $lookup: {
          from: Lead.collection.name,
          let: { session: '$_id' },
          pipeline: [
            {
              $match: {
                ...leadMatch,
                $expr: { $eq: ['$customFields.analyticsSessionId', '$$session'] },
              },
            },
            { $limit: 1 },
          ],
          as: 'leads',
        },
      },
      { $match: { 'leads.0': { $exists: true } } },
      { $count: 'sessions' },
    ]),
  ]);
  const key = (row: Record<string, string>) =>
    ['source', 'medium', 'campaign', 'content'].map((k) => row[k] || '(not set)').join('\u001f');
  const campaignLeadMap = new Map(campaignLeads.map((row) => [key(row._id), row.leads]));
  const eventCount = (name: string): number => events.find((row) => row._id === name)?.count ?? 0;
  const visitorsData = Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() + i * 86400000 + 330 * 60000).toISOString().slice(0, 10);
    return daily.find((row) => row.date === date) ?? { date, visits: 0, unique: 0 };
  });
  sendSuccess(
    res,
    {
      totalVisits: views[0]?.views ?? 0,
      uniqueVisitors: views[0]?.sessions ?? 0,
      avgSessionDuration: null,
      bounceRate: null,
      period: { days, start, end, timezone: 'Asia/Kolkata', channel },
      visitorsData,
      sourceData: sources,
      topPages: pages,
      leads: leadCounts[0]?.total ?? 0,
      qualifiedLeads: leadCounts[0]?.qualified ?? 0,
      wonLeads: leadCounts[0]?.won ?? 0,
      convertedSessions: conversion[0]?.sessions ?? 0,
      conversionRate: views[0]?.sessions
        ? Math.round(((conversion[0]?.sessions ?? 0) / views[0].sessions) * 10000) / 100
        : 0,
      whatsappClicks: eventCount('whatsapp_click'),
      phoneClicks: eventCount('call_click'),
      formStarts: eventCount('form_start'),
      formErrors: eventCount('form_error'),
      campaigns: campaigns.map((row) => ({ ...row, leads: campaignLeadMap.get(key(row)) ?? 0 })),
      blogPerformance: blogs.map((row) => ({
        ...row,
        landingLeads: blogLeads.find((lead) => lead._id === row.path)?.leads ?? 0,
      })),
      integrations: { searchConsole: 'not_connected', googleBusinessProfile: 'utm_only' },
      limitations:
        'Sessions are browser sessions, not people. Clicks are intent, not completed calls or chats. Leads are server-stored enquiries; conversion rate counts tracked sessions with an enquiry in this period. Blog leads use the session landing page. Older records lack campaign and event detail. Source groups may overlap when campaigns change within a session. Bots, opt-outs and blocked requests limit coverage.',
    },
    'Analytics stats retrieved',
  );
});
