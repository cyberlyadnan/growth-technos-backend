import type { PipelineStage } from 'mongoose';

export function reportWindow(days: number, now = new Date()) {
  // India uses UTC+05:30 with no daylight saving. Include today and days-1 local dates.
  const offset = 330 * 60 * 1000;
  const local = new Date(now.getTime() + offset);
  const start = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      offset -
      (days - 1) * 86400000,
  );
  return { start, end: now };
}
export const gbpFields = (prefix: string) => ({
  [`${prefix}utmSource`]: 'google',
  [`${prefix}utmMedium`]: 'organic',
  [`${prefix}utmCampaign`]: { $in: ['gbp_product', 'gbp_profile', 'gbp_post'] },
});
export const pageviewFilter = {
  $or: [{ eventName: 'page_view' }, { eventName: { $exists: false } }],
};
export function sourceExpression() {
  return {
    $switch: {
      branches: [
        {
          case: {
            $and: [
              { $eq: ['$utm.utmSource', 'google'] },
              { $eq: ['$utm.utmMedium', 'organic'] },
              { $in: ['$utm.utmCampaign', ['gbp_product', 'gbp_profile', 'gbp_post']] },
            ],
          },
          then: 'Google Business Profile',
        },
        {
          case: { $ne: [{ $ifNull: ['$utm.utmSource', ''] }, ''] },
          then: {
            $concat: ['$utm.utmSource', ' / ', { $ifNull: ['$utm.utmMedium', '(not set)'] }],
          },
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ['$referrer', ''] },
              regex:
                '^https?://([^/]+\\.)?(google\\.[a-z.]+|bing\\.com|search\\.yahoo\\.com)(:[0-9]+)?$',
            },
          },
          then: 'Organic Search',
        },
        {
          case: {
            $in: [
              { $ifNull: ['$referrer', ''] },
              ['', 'https://www.growthtechnos.com', 'https://growthtechnos.com'],
            ],
          },
          then: 'Direct / unknown',
        },
      ],
      default: 'Referral',
    },
  };
}
export const groupPages: PipelineStage[] = [
  { $group: { _id: '$path', views: { $sum: 1 }, sessions: { $addToSet: '$sessionId' } } },
  { $sort: { views: -1 } },
  { $limit: 25 },
  { $project: { _id: 0, path: '$_id', views: 1, sessions: { $size: '$sessions' } } },
];
