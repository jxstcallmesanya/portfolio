import crypto from 'crypto';

const SESSION_COOKIE = 'admin_session';
const CSRF_COOKIE = 'admin_csrf';

function getCookieValue(req, name) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1].trim()) : null;
}

export function getSessionTokenFromRequest(req) {
  return getCookieValue(req, SESSION_COOKIE);
}

export function getCsrfTokenFromRequest(req) {
  return getCookieValue(req, CSRF_COOKIE);
}

export function verifySessionToken(token) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return payload.sub === 'admin';
  } catch {
    return false;
  }
}

export function createSessionToken() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const payload = {
    sub: 'admin',
    exp: Math.floor(Date.now() / 1000) + 7 * 86400
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function createCsrfToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function verifyCsrfToken(req) {
  const cookieToken = getCsrfTokenFromRequest(req);
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || typeof headerToken !== 'string') return false;

  const a = Buffer.from(String(cookieToken), 'utf8');
  const b = Buffer.from(String(headerToken), 'utf8');
  if (a.length !== b.length) return false;

  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isTrustedOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim();
  if (!host) return false;
  const expected = `${proto}://${host}`.toLowerCase();

  const origin = String(req.headers.origin || '').trim().toLowerCase();
  if (origin) {
    return origin === expected;
  }

  const referer = String(req.headers.referer || '').trim().toLowerCase();
  if (referer) {
    return referer.startsWith(expected);
  }

  return true;
}

export function verifyAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password == null) return false;
  const a = Buffer.from(String(password), 'utf8');
  const b = Buffer.from(String(expected), 'utf8');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildSessionCookie(token, maxAgeSec) {
  const secure =
    process.env.VERCEL === '1' ||
    process.env.NODE_ENV === 'production';
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    'SameSite=Lax'
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearSessionCookie() {
  const secure =
    process.env.VERCEL === '1' ||
    process.env.NODE_ENV === 'production';
  const parts = [`${SESSION_COOKIE}=`, 'HttpOnly', 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildCsrfCookie(token, maxAgeSec) {
  const secure =
    process.env.VERCEL === '1' ||
    process.env.NODE_ENV === 'production';
  const parts = [
    `${CSRF_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    'SameSite=Lax'
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearCsrfCookie() {
  const secure =
    process.env.VERCEL === '1' ||
    process.env.NODE_ENV === 'production';
  const parts = [`${CSRF_COOKIE}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export { SESSION_COOKIE, CSRF_COOKIE };
