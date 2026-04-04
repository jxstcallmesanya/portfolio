import {
  buildClearSessionCookie,
  buildClearCsrfCookie,
  verifyCsrfToken,
  isTrustedOrigin
} from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end();
    return;
  }

  if (!isTrustedOrigin(req) || !verifyCsrfToken(req)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'CSRF check failed' }));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.appendHeader('Set-Cookie', buildClearSessionCookie());
  res.appendHeader('Set-Cookie', buildClearCsrfCookie());
  res.end(JSON.stringify({ ok: true }));
}
