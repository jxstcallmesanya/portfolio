import {
  verifyAdminPassword,
  createSessionToken,
  buildSessionCookie
} from '../lib/auth.js';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end();
    return;
  }

  try {
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
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Неверный пароль' }));
      return;
    }

    const token = createSessionToken();
    res.statusCode = 200;
    res.setHeader('Set-Cookie', buildSessionCookie(token, 7 * 86400));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
  }
}
