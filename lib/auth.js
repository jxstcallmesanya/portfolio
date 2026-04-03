import crypto from 'crypto';

const COOKIE = 'admin_session';

export function getSessionTokenFromRequest(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1].trim()) : null;
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
    `${COOKIE}=${encodeURIComponent(token)}`,
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
  const parts = [`${COOKIE}=`, 'HttpOnly', 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export { COOKIE };
