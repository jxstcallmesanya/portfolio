/**
 * Сканирует img/auto и img/people и перезаписывает gallery.json.
 * Запуск: npm run gallery:scan
 * Поддерживаются .webp, .jpg, .jpeg, .png (регистр имени не важен).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const IMAGE_EXT = /\.(webp|jpe?g|png|gif)$/i;

const FALLBACK = {
  auto: 49,
  people: 15
};

function listSortedFiles(dirRelative) {
  const full = path.join(root, dirRelative);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => IMAGE_EXT.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function toPaths(files, folder) {
  const prefix = `img/${folder}`;
  return files.map((f) => {
    const p = `${prefix}/${f}`;
    return { full: p, thumb: p };
  });
}

function defaultSequential(folder, count) {
  return Array.from({ length: count }, (_, i) => {
    const p = `img/${folder}/${i + 1}.webp`;
    return { full: p, thumb: p };
  });
}

const autoFiles = listSortedFiles('img/auto');
const peopleFiles = listSortedFiles('img/people');

const out = {
  auto: autoFiles.length ? toPaths(autoFiles, 'auto') : defaultSequential('auto', FALLBACK.auto),
  people: peopleFiles.length ? toPaths(peopleFiles, 'people') : defaultSequential('people', FALLBACK.people)
};

const target = path.join(root, 'gallery.json');
fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');

console.log(
  `gallery.json обновлён: авто — ${out.auto.length}, люди — ${out.people.length}` +
    (autoFiles.length === 0 ? ' (авто: шаблон 1…49, папка пуста или нет файлов)' : '') +
    (peopleFiles.length === 0 ? ' (люди: шаблон 1…15, папка пуста или нет файлов)' : '')
);
