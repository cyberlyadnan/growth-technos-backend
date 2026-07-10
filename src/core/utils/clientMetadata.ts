import { Request } from 'express';

export interface ClientMetadata {
  ip: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage?: string;
}

export function extractClientMetadata(req: Request): ClientMetadata {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  return {
    ip,
    userAgent,
    device: detectDevice(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    referrer: req.headers.referer || req.headers.referrer?.toString(),
    utmSource: req.query.utm_source?.toString(),
    utmMedium: req.query.utm_medium?.toString(),
    utmCampaign: req.query.utm_campaign?.toString(),
    utmTerm: req.query.utm_term?.toString(),
    utmContent: req.query.utm_content?.toString(),
    landingPage: req.headers['x-landing-page']?.toString() || req.originalUrl,
  };
}

function detectDevice(ua: string): string {
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

function detectBrowser(ua: string): string {
  if (/chrome/i.test(ua)) return 'chrome';
  if (/firefox/i.test(ua)) return 'firefox';
  if (/safari/i.test(ua)) return 'safari';
  if (/edge/i.test(ua)) return 'edge';
  return 'unknown';
}

function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return 'windows';
  if (/mac/i.test(ua)) return 'macos';
  if (/linux/i.test(ua)) return 'linux';
  if (/android/i.test(ua)) return 'android';
  if (/ios|iphone|ipad/i.test(ua)) return 'ios';
  return 'unknown';
}
