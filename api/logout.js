import { buildClearSessionCookie } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader('Set-Cookie', buildClearSessionCookie());
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: true }));
}
