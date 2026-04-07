import {
  getSessionTokenFromRequest,
  verifySessionToken,
  verifyCsrfToken,
  isTrustedOrigin
} from '../lib/auth.js';
import { prependCompositeGalleryEntry } from '../lib/githubGallery.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (d) => chunks.push(d));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
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

  if (!verifyCsrfToken(req)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'CSRF check failed' }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    const section = body.section;
    const cover = body.cover;
    const items = body.items;
    const title = typeof body.title === 'string' ? body.title : '';
    const description = typeof body.description === 'string' ? body.description : '';
    const meta = {};
    if (title.trim()) meta.title = title.trim();
    if (description.trim()) meta.description = description.trim();

    if (section !== 'auto' && section !== 'people') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Неверный раздел' }));
      return;
    }

    await prependCompositeGalleryEntry(section, cover, items, meta);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error('[gallery-commit-series]', e);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
  }
}
