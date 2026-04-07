import { getSessionTokenFromRequest, verifySessionToken, isTrustedOrigin } from '../lib/auth.js';
import { readGalleryJson } from '../lib/githubGallery.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end();
    return;
  }

  if (!verifySessionToken(getSessionTokenFromRequest(req))) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Нужен вход' }));
    return;
  }

  if (!isTrustedOrigin(req)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Origin not allowed' }));
    return;
  }

  try {
    const gallery = await readGalleryJson();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ ok: true, gallery }));
  } catch (e) {
    console.error('[gallery]', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
  }
}
