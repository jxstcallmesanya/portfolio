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

export async function prependCompositeGalleryEntry(section, cover, items) {
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
