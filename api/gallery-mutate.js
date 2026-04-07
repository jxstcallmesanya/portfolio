import {
  getSessionTokenFromRequest,
  verifySessionToken,
  verifyCsrfToken,
  isTrustedOrigin
} from '../lib/auth.js';
import {
  deleteGalleryEntryAtIndex,
  moveGalleryEntry,
  reorderGallerySection,
  deleteGalleryEntriesAtIndices,
  clearGallerySection,
  updateGalleryEntryMeta
} from '../lib/githubGallery.js';

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
    const {
      action,
      section,
      index,
      direction,
      deleteFiles,
      order,
      indices,
      title,
      description
    } = body;

    if (section !== 'auto' && section !== 'people') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Неверный раздел' }));
      return;
    }

    if (action === 'delete') {
      await deleteGalleryEntryAtIndex(section, index, {
        deleteFiles: deleteFiles !== false
      });
    } else if (action === 'move') {
      await moveGalleryEntry(section, index, direction);
    } else if (action === 'reorder') {
      await reorderGallerySection(section, order);
    } else if (action === 'deleteMany') {
      await deleteGalleryEntriesAtIndices(section, indices, {
        deleteFiles: deleteFiles !== false
      });
    } else if (action === 'clearSection') {
      await clearGallerySection(section, {
        deleteFiles: deleteFiles !== false
      });
    } else if (action === 'updateMeta') {
      await updateGalleryEntryMeta(section, index, { title, description });
    } else {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Неизвестное действие' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error('[gallery-mutate]', e);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
  }
}
