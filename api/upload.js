import busboy from 'busboy';
import { getSessionTokenFromRequest, verifySessionToken } from '../lib/auth.js';
import { uploadImageToRepo } from '../lib/githubGallery.js';

const MAX_BYTES = 4 * 1024 * 1024;

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_BYTES, files: 1 }
    });

    const fields = {};
    let fileBuffer = null;
    let fileInfo = null;
    let limitError = null;

    bb.on('file', (name, stream, info) => {
      if (name !== 'file') {
        stream.resume();
        return;
      }
      const chunks = [];
      stream.on('data', (d) => chunks.push(d));
      stream.on('limit', () => {
        limitError = new Error('Файл больше 4 МБ (лимит Vercel Hobby). Сожмите фото.');
      });
      stream.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
        fileInfo = {
          filename: info.filename,
          mimeType: info.mimeType
        };
      });
    });

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('error', reject);

    bb.on('finish', () => {
      if (limitError) {
        reject(limitError);
        return;
      }
      resolve({ fields, fileBuffer, fileInfo });
    });

    req.pipe(bb);
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

  try {
    const { fields, fileBuffer, fileInfo } = await parseMultipart(req);
    const section = fields.section;

    if (!fileBuffer || !fileBuffer.length) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Файл не получен' }));
      return;
    }

    if (section !== 'auto' && section !== 'people') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Неверный раздел' }));
      return;
    }

    const mime = (fileInfo?.mimeType || '').toLowerCase();
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (!allowed.includes(mime)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Допустимы только JPG, PNG, WebP, GIF'
        })
      );
      return;
    }

    const result = await uploadImageToRepo(
      section,
      fileBuffer,
      fileInfo?.filename,
      fileInfo?.mimeType
    );

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, ...result }));
  } catch (e) {
    console.error('[upload]', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
  }
}
