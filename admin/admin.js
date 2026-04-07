const $ = (id) => document.getElementById(id);
let csrfToken = '';
let galleryCache = { auto: [], people: [] };

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

function setMsg(el, text, kind) {
  el.textContent = text || '';
  el.classList.remove('err', 'ok');
  if (kind) el.classList.add(kind);
}

function selectedSection() {
  const el = document.querySelector('input[name="gallery-section"]:checked');
  return el?.value || 'auto';
}

function manageSection() {
  const el = document.querySelector('input[name="manage-section"]:checked');
  return el?.value || 'auto';
}

function previewPath(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return '';
  if (entry.cover && typeof entry.cover === 'object') {
    return entry.cover.full || entry.cover.thumb || '';
  }
  return entry.full || entry.thumb || '';
}

function entryLabel(entry) {
  if (typeof entry === 'string') return 'Одно фото';
  if (entry && entry.cover && Array.isArray(entry.items)) {
    return `Серия · ${1 + entry.items.length} кадров`;
  }
  return 'Одно фото';
}

async function apiSession() {
  const r = await fetch('/api/session', { credentials: 'same-origin' });
  return r.json();
}

async function apiLogin(password) {
  const r = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ password })
  });
  return r.json();
}

async function apiLogout() {
  await fetch('/api/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : {}
  });
}

async function apiGallery() {
  const r = await fetch('/api/gallery', { credentials: 'same-origin' });
  return r.json();
}

async function apiStats() {
  const r = await fetch('/api/stats', { credentials: 'same-origin' });
  return r.json();
}

async function apiGalleryMutate(body) {
  const r = await fetch('/api/gallery-mutate', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || `Ошибка ${r.status}`);
  }
  return data;
}

async function apiUploadBlob(section, file) {
  const fd = new FormData();
  fd.append('section', section);
  fd.append('skipGallery', '1');
  fd.append('file', file);
  const r = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'same-origin',
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    body: fd
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || `Ошибка ${r.status}`);
  }
  return data;
}

async function apiCommitSeries(section, cover, items) {
  const r = await fetch('/api/gallery-commit-series', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
    },
    body: JSON.stringify({ section, cover, items })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || `Ошибка ${r.status}`);
  }
  return data;
}

function showLogin() {
  $('panel-login').hidden = false;
  $('panel-dash').hidden = true;
}

function showDash() {
  $('panel-login').hidden = true;
  $('panel-dash').hidden = false;
  $('boot-msg').hidden = true;
  $('boot-msg').textContent = '';
}

function renderStats(data) {
  const box = $('stats-box');
  const hint = $('stats-hint');
  if (!box) return;

  if (!data.ok) {
    box.innerHTML = `<p class="hint err">${data.hint || 'Статистика недоступна'}</p>`;
    if (hint) hint.classList.add('stats-warn');
    return;
  }

  if (hint) {
    if (data.kvConfigured === false) hint.classList.add('stats-warn');
    else hint.classList.remove('stats-warn');
  }

  const rows = (data.days || [])
    .slice(-14)
    .map(
      (d) =>
        `<tr><td>${d.date}</td><td class="num">${d.count}</td></tr>`
    )
    .join('');
  box.innerHTML = `<table class="stats-table"><thead><tr><th>Дата (МСК)</th><th>Визиты</th></tr></thead><tbody>${rows}</tbody></table><p class="hint mini">Показаны последние 14 дней из 30 загруженных.</p>`;
}

async function loadStats() {
  try {
    const s = await apiStats();
    renderStats(s);
  } catch {
    $('stats-box').innerHTML = '<p class="hint err">Не удалось загрузить статистику</p>';
  }
}

function renderGalleryManage() {
  const section = manageSection();
  const list = $('gallery-manage-list');
  if (!list) return;
  const entries = galleryCache[section] || [];
  if (!entries.length) {
    list.innerHTML = '<p class="hint">В этом разделе пока пусто.</p>';
    return;
  }

  list.innerHTML = entries
    .map((entry, index) => {
      const prev = previewPath(entry);
      const src = prev ? `/${prev.replace(/^\//, '')}` : '';
      const label = entryLabel(entry);
      return `
        <div class="gallery-manage-row" data-index="${index}">
          <div class="gallery-manage-thumb-wrap">
            ${src ? `<img class="gallery-manage-thumb" src="${src}" alt="" loading="lazy" />` : '<div class="gallery-manage-ph"></div>'}
          </div>
          <div class="gallery-manage-meta">
            <span class="gallery-manage-label">#${index + 1} · ${label}</span>
            <span class="gallery-manage-path">${prev || '—'}</span>
          </div>
          <div class="gallery-manage-actions">
            <button type="button" class="btn btn-mini btn-ghost" data-act="up" ${index === 0 ? 'disabled' : ''} aria-label="Выше">↑</button>
            <button type="button" class="btn btn-mini btn-ghost" data-act="down" ${index === entries.length - 1 ? 'disabled' : ''} aria-label="Ниже">↓</button>
            <button type="button" class="btn btn-mini btn-danger" data-act="del" aria-label="Удалить">Удалить</button>
          </div>
        </div>`;
    })
    .join('');

  list.querySelectorAll('button[data-act]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.gallery-manage-row');
      const index = Number(row?.dataset.index);
      if (Number.isNaN(index)) return;
      const act = btn.dataset.act;
      const msgEl = $('dash-msg');
      try {
        if (act === 'del') {
          if (!confirm(`Удалить элемент #${index + 1} из ${section}?`)) return;
          setMsg(msgEl, 'Удаление…');
          await apiGalleryMutate({ action: 'delete', section, index });
        } else if (act === 'up') {
          setMsg(msgEl, 'Сохранение порядка…');
          await apiGalleryMutate({ action: 'move', section, index, direction: 'up' });
        } else if (act === 'down') {
          setMsg(msgEl, 'Сохранение порядка…');
          await apiGalleryMutate({ action: 'move', section, index, direction: 'down' });
        }
        setMsg(msgEl, 'Готово. После деплоя Vercel изменения на сайте.', 'ok');
        await loadGalleryData();
      } catch (e) {
        setMsg(msgEl, e.message || String(e), 'err');
      }
    });
  });
}

async function loadGalleryData() {
  try {
    const g = await apiGallery();
    if (!g.ok || !g.gallery) throw new Error('Нет данных');
    galleryCache.auto = Array.isArray(g.gallery.auto) ? g.gallery.auto : [];
    galleryCache.people = Array.isArray(g.gallery.people) ? g.gallery.people : [];
    renderGalleryManage();
  } catch {
    $('gallery-manage-list').innerHTML = '<p class="hint err">Не удалось загрузить gallery.json</p>';
  }
}

async function saveSeriesFlow() {
  const section = selectedSection();
  const coverInput = $('cover-file');
  const moreInput = $('more-files');
  const msgEl = $('dash-msg');
  const btn = $('btn-save-series');

  const coverFile = coverInput.files?.[0];
  if (!coverFile) {
    setMsg(msgEl, 'Выберите обложку или одно фото', 'err');
    return;
  }

  const moreFiles = Array.from(moreInput.files || []);

  btn.disabled = true;
  setMsg(msgEl, 'Загрузка обложки…');

  try {
    const coverRes = await apiUploadBlob(section, coverFile);
    const cover = { full: coverRes.path, thumb: coverRes.thumbPath };

    const items = [];
    for (let i = 0; i < moreFiles.length; i++) {
      const f = moreFiles[i];
      setMsg(msgEl, `Загрузка ${i + 1} из ${moreFiles.length} (доп. фото): ${f.name}…`);
      const res = await apiUploadBlob(section, f);
      items.push({ full: res.path, thumb: res.thumbPath });
    }

    setMsg(msgEl, 'Запись в gallery.json…');
    await apiCommitSeries(section, cover, items);

    setMsg(
      msgEl,
      `Готово: ${items.length ? `серия из ${items.length + 1} фото` : 'одно фото'}. После деплоя Vercel (1–2 мин) обновится сайт.`,
      'ok'
    );
    coverInput.value = '';
    moreInput.value = '';
    await loadGalleryData();
  } catch (e) {
    setMsg(msgEl, e.message || String(e), 'err');
  } finally {
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const boot = $('boot-msg');
  try {
    const s = await apiSession();
    csrfToken = s.csrfToken || getCookie('admin_csrf') || '';
    boot.hidden = true;
    if (s.ok) {
      showDash();
      await loadStats();
      await loadGalleryData();
    } else {
      showLogin();
    }
  } catch {
    setMsg(boot, 'Не удалось связаться с API. Убедитесь, что проект задеплоен на Vercel с папкой /api.', 'err');
    showLogin();
  }

  $('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('login-password').value;
    const msg = $('login-msg');
    setMsg(msg, 'Вход…');
    try {
      const data = await apiLogin(pw);
      if (data.ok) {
        csrfToken = data.csrfToken || getCookie('admin_csrf') || '';
        $('login-password').value = '';
        setMsg(msg, '');
        showDash();
        await loadStats();
        await loadGalleryData();
      } else {
        setMsg(msg, data.error || 'Ошибка входа', 'err');
      }
    } catch {
      setMsg(msg, 'Сеть или сервер недоступны', 'err');
    }
  });

  $('btn-logout').addEventListener('click', async () => {
    await apiLogout();
    showLogin();
    setMsg($('login-msg'), 'Вы вышли');
    setMsg($('dash-msg'), '');
  });

  $('btn-save-series').addEventListener('click', () => saveSeriesFlow());

  document.querySelectorAll('input[name="manage-section"]').forEach((r) => {
    r.addEventListener('change', () => renderGalleryManage());
  });

  $('btn-refresh-gallery')?.addEventListener('click', async () => {
    setMsg($('dash-msg'), 'Обновление…');
    await loadGalleryData();
    setMsg($('dash-msg'), 'Список обновлён', 'ok');
  });
});
