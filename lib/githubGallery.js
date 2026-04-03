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

export async function uploadImageToRepo(section, buffer, originalFilename, mimeType) {
  const { owner, repo, branch, octokit } = getRepoConfig();
  if (section !== 'auto' && section !== 'people') {
    throw new Error('Invalid section');
  }
  const filename = safeFilename(originalFilename, mimeType);
  const relPath = `img/${section}/${filename}`;
  const imagePath = relPath;

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: imagePath,
    message: `admin: upload ${filename} → ${section}`,
    content: buffer.toString('base64'),
    branch
  });

  await appendGalleryEntry(octokit, owner, repo, branch, section, relPath);

  return { path: relPath, filename };
}

async function appendGalleryEntry(octokit, owner, repo, branch, section, relPath) {
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

    if (section === 'auto') {
      if (!Array.isArray(json.auto)) json.auto = [];
      json.auto.push(relPath);
    } else {
      if (!Array.isArray(json.people)) json.people = [];
      json.people.push(relPath);
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
