import {
  verifyAdminPassword,
  createSessionToken,
  buildSessionCookie,
  createCsrfToken,
  buildCsrfCookie,
  isTrustedOrigin
} from '../lib/auth.js';

const MAX_ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;
const loginAttempts = new Map();

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 65536) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function getClientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (fwd) return fwd;
  return (
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function isRateLimited(req) {
  const now = Date.now();
  const key = getClientIp(req);
  const state = loginAttempts.get(key);
  if (!state) return false;
  if (now - state.first > WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return state.count >= MAX_ATTEMPTS;
}

function markFailedAttempt(req) {
  const now = Date.now();
  const key = getClientIp(req);
  const state = loginAttempts.get(key);
  if (!state || now - state.first > WINDOW_MS) {
    loginAttempts.set(key, { first: now, count: 1 });
    return;
  }
  state.count += 1;
  loginAttempts.set(key, state);
}

function clearFailedAttempts(req) {
  loginAttempts.delete(getClientIp(req));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end();
    return;
  }

  try {
    if (!isTrustedOrigin(req)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Origin not allowed' }));
      return;
    }

    if (isRateLimited(req)) {
      res.statusCode = 429;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Слишком много попыток. Повторите позже.' }));
      return;
    }

    if (!process.env.SESSION_SECRET) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Сервер не настроен: задайте SESSION_SECRET в Vercel.'
        })
      );
      return;
    }

    if (!process.env.ADMIN_PASSWORD) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Сервер не настроен: задайте ADMIN_PASSWORD в Vercel.'
        })
      );
      return;
    }

    const body = await parseJsonBody(req);
    if (!verifyAdminPassword(body.password)) {
      markFailedAttempt(req);
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Неверный пароль' }));
      return;
    }

    clearFailedAttempts(req);
    const token = createSessionToken();
    const csrf = createCsrfToken();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.appendHeader('Set-Cookie', buildSessionCookie(token, 7 * 86400));
    res.appendHeader('Set-Cookie', buildCsrfCookie(csrf, 7 * 86400));
    res.end(JSON.stringify({ ok: true, csrfToken: csrf }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
  }
}
