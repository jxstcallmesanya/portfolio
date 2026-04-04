import {
  getSessionTokenFromRequest,
  verifySessionToken,
  getCsrfTokenFromRequest,
  createCsrfToken,
  buildCsrfCookie
} from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end();
    return;
  }

  const ok = verifySessionToken(getSessionTokenFromRequest(req));
  let csrfToken = ok ? getCsrfTokenFromRequest(req) : null;

  /* Сессия после обновления кода могла остаться без admin_csrf — выдаём токен и cookie */
  if (ok && !csrfToken) {
    csrfToken = createCsrfToken();
    res.appendHeader('Set-Cookie', buildCsrfCookie(csrfToken, 7 * 86400));
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok, csrfToken: ok ? csrfToken : null }));
}
