import sharp from 'sharp';

/**
 * Перед загрузкой в репозиторий: JPEG/PNG → WebP. GIF с несколькими кадрами оставляем как GIF.
 * Уже WebP можно пропустить или слегка перекодировать — оставляем буфер как есть для скорости.
 */
export async function prepareUploadBuffer(buffer, mimeRaw) {
  const mime = (mimeRaw || '').toLowerCase();

  if (mime === 'image/webp') {
    return { buffer, mime: 'image/webp', converted: false };
  }

  if (mime === 'image/gif') {
    const meta = await sharp(buffer, { animated: true, failOn: 'none' }).metadata();
    if (meta.pages && meta.pages > 1) {
      return { buffer, mime: 'image/gif', converted: false };
    }
    const out = await sharp(buffer, { failOn: 'none' }).rotate().webp({ quality: 86, effort: 4 }).toBuffer();
    return { buffer: out, mime: 'image/webp', converted: true };
  }

  if (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/png') {
    const out = await sharp(buffer, { failOn: 'none' }).rotate().webp({ quality: 88, effort: 4 }).toBuffer();
    return { buffer: out, mime: 'image/webp', converted: true };
  }

  return { buffer, mime, converted: false };
}
