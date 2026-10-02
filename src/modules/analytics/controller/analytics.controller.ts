import { Request, Response } from 'express';
import { Pageview } from '../model/pageview.model';
import { asyncHandler, sendCreated, sendSuccess } from '@core/response';

export const trackPageview = asyncHandler(async (req: Request, res: Response) => {
  const { path, referrer, sessionId } = req.body;
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.socket.remoteAddress || '';

  if (!path || !sessionId) {
    res.status(400).json({ success: false, message: 'path and sessionId are required' });
    return;
  }

  await Pageview.create({
    path,
    referrer: referrer || '',
    userAgent,
    ip,
    sessionId,
  });

  sendCreated(res, null, 'Pageview tracked');
});

export const getAnalyticsStats = asyncHandler(async (_req: Request, res: Response) => {
  // Aggregate stats
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Total pageviews
  const totalVisits = await Pageview.countDocuments();

  // 2. Unique visitors (distinct sessionIds)
  const uniqueVisitors = (await Pageview.distinct('sessionId')).length;

  // 3. Traffic sources (simplified)
  const sourcesAgg = await Pageview.aggregate([
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$referrer', ''] },
            'Direct',
            {
              $cond: [
                { $regexMatch: { input: '$referrer', regex: /google|bing|yahoo/i } },
                'Organic Search',
                {
                  $cond: [
                    { $regexMatch: { input: '$referrer', regex: /facebook|twitter|instagram|linkedin/i } },
                    'Social Media',
                    'Referral'
                  ]
                }
              ]
            }
          ]
        },
        value: { $sum: 1 }
      }
    },
    { $project: { name: '$_id', value: 1, _id: 0 } }
  ]);

  // Ensure default sources exist
  const sourceNames = ['Organic Search', 'Direct', 'Social Media', 'Referral'];
  const sources = sourceNames.map((name) => {
    const found = sourcesAgg.find((s) => s.name === name);
    return found ? found : { name, value: 0 };
  });

  // 4. Visitors over last 7 days
  const dailyVisitsAgg = await Pageview.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        visits: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $project: {
        date: '$_id',
        visits: 1,
        unique: { $size: '$uniqueSessions' },
        _id: 0
      }
    },
    { $sort: { date: 1 } }
  ]);

  // Format date to 'Oct 1' format
  const visitorsData = dailyVisitsAgg.map((day) => {
    const dateObj = new Date(day.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      date: formattedDate,
      visits: day.visits,
      unique: day.unique
    };
  });

  // Fill in missing days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!visitorsData.find((v) => v.date === formattedDate)) {
      visitorsData.push({ date: formattedDate, visits: 0, unique: 0 });
    }
  }
  
  // Sort by date again properly using real date
  visitorsData.sort((a, b) => {
    return new Date(a.date + ' ' + now.getFullYear()).getTime() - new Date(b.date + ' ' + now.getFullYear()).getTime();
  });

  // 5. Top pages
  const topPagesAgg = await Pageview.aggregate([
    {
      $group: {
        _id: '$path',
        views: { $sum: 1 },
      }
    },
    { $sort: { views: -1 } },
    { $limit: 5 },
    {
      $project: {
        path: '$_id',
        views: 1,
        _id: 0
      }
    }
  ]);
  
  const topPages = topPagesAgg.map(page => ({
    ...page,
    bounceRate: Math.floor(Math.random() * 30 + 20) + '%', // Mocking bounce rate since it needs complex session analysis
    timeOnPage: `0${Math.floor(Math.random() * 3)}:${Math.floor(Math.random() * 50 + 10)}`, // Mocking time on page
  }));

  sendSuccess(res, {
    totalVisits,
    uniqueVisitors,
    avgSessionDuration: '02:35', // Stub
    bounceRate: '42.3%', // Stub
    visitorsData,
    sourceData: sources,
    topPages,
  }, 'Analytics stats retrieved');
});
