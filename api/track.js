import { incrementVisitToday } from '../lib/statsKv.js';

function isLikelyBot(ua) {
  if (!ua || typeof ua !== 'string') return false;
  const s = ua.toLowerCase();
  return /bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(s);
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    res.end();
    return;
  }

  const ua = req.headers['user-agent'] || '';
  if (isLikelyBot(ua)) {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const result = await incrementVisitToday();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(result.skipped ? { ok: true, skipped: true } : { ok: true, ...result }));
  } catch (e) {
    console.error('[track]', e);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false }));
  }
}
