import busboy from 'busboy';
import sharp from 'sharp';
import {
  getSessionTokenFromRequest,
  verifySessionToken,
  verifyCsrfToken,
  isTrustedOrigin
} from '../lib/auth.js';
import { putImageInRepo, appendSingleToGallery } from '../lib/githubGallery.js';
import { prepareUploadBuffer } from '../lib/imageWebp.js';

const MAX_BYTES = 4 * 1024 * 1024;

function hasValidImageSignature(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8;
  }

  if (mime === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mime === 'image/gif') {
    const sig = buffer.slice(0, 6).toString('ascii');
    return sig === 'GIF87a' || sig === 'GIF89a';
  }

  if (mime === 'image/webp') {
    const riff = buffer.slice(0, 4).toString('ascii');
    const webp = buffer.slice(8, 12).toString('ascii');
    return riff === 'RIFF' && webp === 'WEBP';
  }

  return false;
}

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

async function buildThumbnailBuffer(buffer, mime) {
  const isAnimatedGif = mime === 'image/gif';
  const pipeline = sharp(buffer, { animated: isAnimatedGif, failOn: 'none' })
    .rotate()
    .resize({
      width: 640,
      height: 640,
      fit: 'inside',
      withoutEnlargement: true
    });

  return pipeline.webp({ quality: 68, effort: 4 }).toBuffer();
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
    const { fields, fileBuffer, fileInfo } = await parseMultipart(req);
    const section = fields.section;
    const skipGallery =
      fields.skipGallery === '1' ||
      fields.skipGallery === 'true' ||
      fields.skipGallery === 'yes';

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

    if (!hasValidImageSignature(fileBuffer, mime)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Файл не похож на корректное изображение'
        })
      );
      return;
    }

    let masterBuffer = fileBuffer;
    let masterMime = mime;
    try {
      const prep = await prepareUploadBuffer(fileBuffer, mime);
      masterBuffer = prep.buffer;
      masterMime = prep.mime;
    } catch (convErr) {
      console.warn('[upload] webp conversion failed, using original', convErr?.message || convErr);
    }

    let thumbBuffer = null;
    try {
      thumbBuffer = await buildThumbnailBuffer(masterBuffer, masterMime);
    } catch (thumbErr) {
      console.warn('[upload] thumb generation failed, fallback to original', thumbErr?.message || thumbErr);
      thumbBuffer = null;
    }

    const outName =
      masterMime === 'image/webp' && /\.(jpe?g|png|gif)$/i.test(fileInfo?.filename || '')
        ? String(fileInfo.filename).replace(/\.[^.]+$/, '.webp')
        : fileInfo?.filename;

    const result = await putImageInRepo(
      section,
      masterBuffer,
      outName || fileInfo?.filename,
      masterMime,
      thumbBuffer
    );
    if (!skipGallery) {
      await appendSingleToGallery(section, result.path, result.thumbPath);
    }

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
