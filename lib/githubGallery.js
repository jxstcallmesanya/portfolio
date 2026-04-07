import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

function getRepoConfig() {
  const owner = process.env.GITHUB_OWNER || 'jxstcallmesanya';
  const repo = process.env.GITHUB_REPO || 'portfolio';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not configured');
  return { owner, repo, branch, octokit: new Octokit({ auth: token }) };
}

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

export function safeFilename(originalFilename, mimeType) {
  const extFromMime = MIME_EXT[mimeType?.toLowerCase?.()] || '';
  let ext = extFromMime;
  if (!ext && originalFilename) {
    const m = String(originalFilename).match(/\.([a-zA-Z0-9]+)$/);
    if (m) ext = m[1].toLowerCase();
  }
  if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    ext = 'jpg';
  }
  if (ext === 'jpeg') ext = 'jpg';
  const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  return `${id}.${ext}`;
}

function normalizeRepoPath(p) {
  if (!p || typeof p !== 'string') return '';
  return p.replace(/^\//, '');
}

export function collectPathsFromEntry(entry) {
  const out = new Set();
  if (typeof entry === 'string') {
    const n = normalizeRepoPath(entry);
    if (n) out.add(n);
    return [...out];
  }
  if (!entry || typeof entry !== 'object') return [];

  if (entry.cover && typeof entry.cover === 'object') {
    if (entry.cover.full) out.add(normalizeRepoPath(entry.cover.full));
    if (entry.cover.thumb) out.add(normalizeRepoPath(entry.cover.thumb));
  }
  if (typeof entry.full === 'string') out.add(normalizeRepoPath(entry.full));
  if (typeof entry.thumb === 'string') out.add(normalizeRepoPath(entry.thumb));
  if (Array.isArray(entry.items)) {
    entry.items.forEach((it) => {
      if (it?.full) out.add(normalizeRepoPath(it.full));
      if (it?.thumb) out.add(normalizeRepoPath(it.thumb));
    });
  }
  return [...out].filter(Boolean);
}

async function deleteFileFromRepo(octokit, owner, repo, branch, filePath) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch
    });
    if (Array.isArray(data) || !data.sha) return;
    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path: filePath,
      message: `admin: delete file ${filePath}`,
      sha: data.sha,
      branch
    });
  } catch (e) {
    if (e.status === 404) return;
    console.warn('[gallery] delete file failed', filePath, e.message || e);
  }
}

export async function readGalleryJson() {
  const { owner, repo, branch, octokit } = getRepoConfig();
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: 'gallery.json',
    ref: branch
  });
  if (Array.isArray(data) || data.type !== 'file' || !data.content) {
    throw new Error('gallery.json is not a file');
  }
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
}

export async function writeGalleryJson(json, message) {
  const { owner, repo, branch, octokit } = getRepoConfig();
  const path = 'gallery.json';

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });

    if (Array.isArray(data) || data.type !== 'file' || !data.content) {
      throw new Error('gallery.json is not a file');
    }

    const sha = data.sha;
    const newContent = `${JSON.stringify(json, null, 2)}\n`;

    try {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(newContent, 'utf8').toString('base64'),
        sha,
        branch
      });
      return;
    } catch (e) {
      if (e.status === 409 && attempt < 4) {
        continue;
      }
      throw e;
    }
  }
}

export async function deleteGalleryEntryAtIndex(section, index, options = {}) {
  const deleteFiles = options.deleteFiles !== false;
  if (section !== 'auto' && section !== 'people') {
    throw new Error('Invalid section');
  }
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0) {
    throw new Error('Invalid index');
  }

  const json = await readGalleryJson();
  const key = section === 'auto' ? 'auto' : 'people';
  if (!Array.isArray(json[key])) json[key] = [];
  const arr = json[key];
  if (idx >= arr.length) {
    throw new Error('Index out of range');
  }

  const removed = arr[idx];
  const paths = collectPathsFromEntry(removed);
  arr.splice(idx, 1);
  await writeGalleryJson(json, `admin: gallery.json remove ${section} #${idx}`);

  if (deleteFiles && paths.length) {
    const { owner, repo, branch, octokit } = getRepoConfig();
    for (const p of paths) {
      await deleteFileFromRepo(octokit, owner, repo, branch, p);
    }
  }
}

export async function moveGalleryEntry(section, index, direction) {
  if (section !== 'auto' && section !== 'people') {
    throw new Error('Invalid section');
  }
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0) {
    throw new Error('Invalid index');
  }
  if (direction !== 'up' && direction !== 'down') {
    throw new Error('Invalid direction');
  }

  const json = await readGalleryJson();
  const key = section === 'auto' ? 'auto' : 'people';
  if (!Array.isArray(json[key])) json[key] = [];
  const arr = json[key];

  if (direction === 'up') {
    if (idx <= 0) return;
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
  } else {
    if (idx >= arr.length - 1) return;
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
  }

  await writeGalleryJson(json, `admin: gallery.json reorder ${section}`);
}

export async function putImageInRepo(section, buffer, originalFilename, mimeType, thumbBuffer) {
  const { owner, repo, branch, octokit } = getRepoConfig();
  if (section !== 'auto' && section !== 'people') {
    throw new Error('Invalid section');
  }
  const filename = safeFilename(originalFilename, mimeType);
  const relPath = `img/${section}/${filename}`;
  const imagePath = relPath;

  let thumbRelPath = relPath;

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: imagePath,
    message: `admin: upload ${filename} → ${section}`,
    content: buffer.toString('base64'),
    branch
  });

  if (Buffer.isBuffer(thumbBuffer) && thumbBuffer.length > 0) {
    const baseName = filename.replace(/\.[a-z0-9]+$/i, '');
    const thumbFile = `${baseName}-thumb.webp`;
    thumbRelPath = `img/thumbs/${section}/${thumbFile}`;

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: thumbRelPath,
      message: `admin: upload thumb ${thumbFile} → ${section}`,
      content: thumbBuffer.toString('base64'),
      branch
    });
  }

  return { path: relPath, thumbPath: thumbRelPath, filename };
}

export async function uploadImageToRepo(section, buffer, originalFilename, mimeType, thumbBuffer) {
  const result = await putImageInRepo(section, buffer, originalFilename, mimeType, thumbBuffer);
  await appendSingleToGallery(section, result.path, result.thumbPath);
  return result;
}

export async function appendSingleToGallery(section, relPath, thumbRelPath) {
  const { owner, repo, branch, octokit } = getRepoConfig();
  await appendGalleryEntry(octokit, owner, repo, branch, section, relPath, thumbRelPath);
}

async function appendGalleryEntry(octokit, owner, repo, branch, section, relPath, thumbRelPath) {
  const path = 'gallery.json';
  let sha;
  let json;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });

    if (Array.isArray(data) || data.type !== 'file' || !data.content) {
      throw new Error('gallery.json is not a file');
    }

    sha = data.sha;
    json = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));

    const nextEntry = { full: relPath, thumb: thumbRelPath || relPath };
    const key = section === 'auto' ? 'auto' : 'people';
    if (!Array.isArray(json[key])) json[key] = [];

    const alreadyExists = json[key].some((entry) => {
      if (typeof entry === 'string') return entry === relPath;
      if (entry && typeof entry === 'object') {
        return entry.full === relPath || entry.src === relPath || entry.image === relPath;
      }
      return false;
    });
    if (!alreadyExists) {
      json[key].unshift(nextEntry);
    }

    const newContent = `${JSON.stringify(json, null, 2)}\n`;

    try {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `admin: gallery.json (+1 in ${section})`,
        content: Buffer.from(newContent, 'utf8').toString('base64'),
        sha,
        branch
      });
      return;
    } catch (e) {
      if (e.status === 409 && attempt < 4) {
        continue;
      }
      throw e;
    }
  }
}

function pathsBelongToSection(section, full, thumb) {
  if (section !== 'auto' && section !== 'people') return false;
  if (typeof full !== 'string' || typeof thumb !== 'string') return false;
  const imgPrefix = `img/${section}/`;
  const thumbPrefix = `img/thumbs/${section}/`;
  if (!full.startsWith(imgPrefix)) return false;
  if (thumb === full) return true;
  return thumb.startsWith(thumbPrefix);
}

function applyMetaToEntry(nextEntry, meta) {
  if (!meta || typeof meta !== 'object') return;
  const title = typeof meta.title === 'string' ? meta.title.trim().slice(0, 200) : '';
  const description = typeof meta.description === 'string' ? meta.description.trim().slice(0, 2000) : '';
  if (title) nextEntry.title = title;
  if (description) nextEntry.description = description;
}

export async function prependCompositeGalleryEntry(section, cover, items, meta = {}) {
  if (section !== 'auto' && section !== 'people') {
    throw new Error('Invalid section');
  }
  if (!cover || typeof cover.full !== 'string' || typeof cover.thumb !== 'string') {
    throw new Error('Invalid cover');
  }
  if (!pathsBelongToSection(section, cover.full, cover.thumb)) {
    throw new Error('Cover paths do not match section');
  }
  const list = Array.isArray(items) ? items : [];
  for (const it of list) {
    if (!it || typeof it.full !== 'string' || typeof it.thumb !== 'string') {
      throw new Error('Invalid item in series');
    }
    if (!pathsBelongToSection(section, it.full, it.thumb)) {
      throw new Error('Item paths do not match section');
    }
  }

  const { owner, repo, branch, octokit } = getRepoConfig();
  const path = 'gallery.json';

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });

    if (Array.isArray(data) || data.type !== 'file' || !data.content) {
      throw new Error('gallery.json is not a file');
    }

    const sha = data.sha;
    const json = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    const key = section === 'auto' ? 'auto' : 'people';
    if (!Array.isArray(json[key])) json[key] = [];

    let nextEntry;
    if (list.length === 0) {
      nextEntry = { full: cover.full, thumb: cover.thumb };
    } else {
      nextEntry = {
        cover: { full: cover.full, thumb: cover.thumb },
        items: list.map((it) => ({ full: it.full, thumb: it.thumb }))
      };
    }

    applyMetaToEntry(nextEntry, meta);

    json[key].unshift(nextEntry);

    const newContent = `${JSON.stringify(json, null, 2)}\n`;

    try {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message:
          list.length === 0
            ? `admin: gallery.json (+1 single in ${section})`
            : `admin: gallery.json (+1 series in ${section})`,
        content: Buffer.from(newContent, 'utf8').toString('base64'),
        sha,
        branch
      });
      return { ok: true };
    } catch (e) {
      if (e.status === 409 && attempt < 4) {
        continue;
      }
      throw e;
    }
  }
}

function validatePermutation(newOrder, n) {
  if (!Array.isArray(newOrder) || newOrder.length !== n) {
    throw new Error('Invalid order length');
  }
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    const v = Number(newOrder[i]);
    if (!Number.isInteger(v) || v < 0 || v >= n || seen.has(v)) {
      throw new Error('Invalid permutation');
    }
    seen.add(v);
  }
}

export async function reorderGallerySection(section, newOrder) {
  if (section !== 'auto' && section !== 'people') {
    throw new Error('Invalid section');
  }
  const json = await readGalleryJson();
  const key = section === 'auto' ? 'auto' : 'people';
  if (!Array.isArray(json[key])) json[key] = [];
  const arr = json[key];
  validatePermutation(newOrder, arr.length);
  json[key] = newOrder.map((oldIdx) => arr[oldIdx]);
  await writeGalleryJson(json, `admin: gallery reorder ${section}`);
}

export async function deleteGalleryEntriesAtIndices(section, indices, options = {}) {
  const deleteFiles = options.deleteFiles !== false;
  if (section !== 'auto' && section !== 'people') {
    throw new Error('Invalid section');
  }
  const idxSet = new Set(
    (Array.isArray(indices) ? indices : [])
      .map(Number)
      .filter((i) => Number.isInteger(i) && i >= 0)
  );
  if (idxSet.size === 0) {
    throw new Error('No indices');
  }

  const json = await readGalleryJson();
  const key = section === 'auto' ? 'auto' : 'people';
  if (!Array.isArray(json[key])) json[key] = [];
  const arr = json[key];

  const allPaths = new Set();
  for (const i of idxSet) {
    if (i >= arr.length) continue;
    collectPathsFromEntry(arr[i]).forEach((p) => allPaths.add(p));
  }

  json[key] = arr.filter((_, i) => !idxSet.has(i));
  await writeGalleryJson(json, `admin: gallery bulk delete ${section}`);

  if (deleteFiles && allPaths.size) {
    const { owner, repo, branch, octokit } = getRepoConfig();
    for (const p of allPaths) {
      await deleteFileFromRepo(octokit, owner, repo, branch, p);
    }
  }
}

export async function clearGallerySection(section, options = {}) {
  const deleteFiles = options.deleteFiles !== false;
  if (section !== 'auto' && section !== 'people') {
    throw new Error('Invalid section');
  }

  const json = await readGalleryJson();
  const key = section === 'auto' ? 'auto' : 'people';
  const arr = Array.isArray(json[key]) ? json[key] : [];
  const allPaths = new Set();
  arr.forEach((e) => collectPathsFromEntry(e).forEach((p) => allPaths.add(p)));
  json[key] = [];
  await writeGalleryJson(json, `admin: clear gallery ${section}`);

  if (deleteFiles && allPaths.size) {
    const { owner, repo, branch, octokit } = getRepoConfig();
    for (const p of allPaths) {
      await deleteFileFromRepo(octokit, owner, repo, branch, p);
    }
  }
}

export async function updateGalleryEntryMeta(section, index, meta) {
  if (section !== 'auto' && section !== 'people') {
    throw new Error('Invalid section');
  }
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0) {
    throw new Error('Invalid index');
  }
  if (!meta || typeof meta !== 'object') {
    throw new Error('Invalid meta');
  }

  const json = await readGalleryJson();
  const key = section === 'auto' ? 'auto' : 'people';
  if (!Array.isArray(json[key])) json[key] = [];
  const arr = json[key];
  if (idx >= arr.length) {
    throw new Error('Index out of range');
  }

  const entry = arr[idx];
  const title =
    meta.title !== undefined
      ? String(meta.title).trim().slice(0, 200)
      : undefined;
  const description =
    meta.description !== undefined
      ? String(meta.description).trim().slice(0, 2000)
      : undefined;

  if (typeof entry === 'string') {
    const obj = { full: entry, thumb: entry };
    if (title !== undefined && title) obj.title = title;
    if (description !== undefined && description) obj.description = description;
    arr[idx] = obj;
  } else if (entry && typeof entry === 'object') {
    if (title !== undefined) {
      if (title) entry.title = title;
      else delete entry.title;
    }
    if (description !== undefined) {
      if (description) entry.description = description;
      else delete entry.description;
    }
  }

  await writeGalleryJson(json, `admin: meta ${section} #${idx}`);
}
