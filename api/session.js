import {
  getSessionTokenFromRequest,
  verifySessionToken,
  getCsrfTokenFromRequest
} from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end();
    return;
  }

  const ok = verifySessionToken(getSessionTokenFromRequest(req));
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok, csrfToken: ok ? getCsrfTokenFromRequest(req) : null }));
}
