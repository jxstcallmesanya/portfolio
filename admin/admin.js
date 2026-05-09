const $ = (id) => document.getElementById(id);
let csrfToken = '';
let galleryCache = { auto: [], people: [] };
let siteContentCache = null;

const SITE_CONTENT_FIELDS = [
  ['heroKicker', 'content-hero-kicker-input'],
  ['heroText', 'content-hero-text-input'],
  ['heroCtaText', 'content-hero-cta-text-input'],
  ['heroCtaUrl', 'content-hero-cta-url-input'],
  ['aboutTag', 'content-about-tag-input'],
  ['aboutTitleHtml', 'content-about-title-input'],
  ['aboutSpecs', 'content-about-specs-input'],
  ['aboutBio', 'content-about-bio-input'],
  ['aboutItem1', 'content-about-item1-input'],
  ['aboutItem2', 'content-about-item2-input'],
  ['contactTitle', 'content-contact-title-input'],
  ['contactTelegramUrl', 'content-contact-telegram-input'],
  ['contactVkUrl', 'content-contact-vk-input'],
  ['contactEmailUrl', 'content-contact-email-input']
];
const VISUAL_TEXT_KEYS = [
  'heroKicker',
  'heroText',
  'heroCtaText',
  'aboutTitleHtml',
  'aboutSpecs',
  'aboutBio',
  'aboutItem1',
  'aboutItem2',
  'contactTitle',
  'autoTitle',
  'autoLead',
  'autoCtaTitle',
  'autoCtaText',
  'autoCtaButton',
  'peopleTitle',
  'peopleLead',
  'peopleCtaTitle',
  'peopleCtaText',
  'peopleCtaButton',
  'shootingTitle',
  'shootingLead',
  'shootingCtaTitle',
  'shootingCtaText',
  'shootingCtaButton'
];

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

function setMsg(el, text, kind) {
  el.textContent = text || '';
  el.classList.remove('err', 'ok');
  if (kind) el.classList.add(kind);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function entryTitleDesc(entry) {
  if (typeof entry === 'string') return { title: '', description: '' };
  return {
    title: typeof entry.title === 'string' ? entry.title : '',
    description: typeof entry.description === 'string' ? entry.description : ''
  };
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

async function apiSiteContent() {
  const r = await fetch('/api/site-content', { credentials: 'same-origin' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Ошибка ${r.status}`);
  return data;
}

async function apiSiteContentSave(content) {
  const r = await fetch('/api/site-content', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
    },
    body: JSON.stringify({ content })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Ошибка ${r.status}`);
  return data;
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

function uploadBlobWithProgress(section, file, onRatio) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('section', section);
    fd.append('skipGallery', '1');
    fd.append('file', file);

    xhr.open('POST', '/api/upload');
    xhr.withCredentials = true;
    if (csrfToken) xhr.setRequestHeader('x-csrf-token', csrfToken);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && typeof onRatio === 'function') {
        onRatio(e.loaded / e.total);
      }
    });

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        reject(new Error('Некорректный ответ сервера'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
        resolve(data);
        return;
      }
      reject(new Error(data.error || `Ошибка ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Сеть недоступна'));
    xhr.send(fd);
  });
}

function setUploadProgress(visible, pct, labelText) {
  const wrap = $('upload-progress-wrap');
  const fill = $('upload-progress-fill');
  const label = $('upload-progress-label');
  const track = wrap?.querySelector('.upload-progress-track');
  if (!wrap || !fill) return;
  if (!visible) {
    wrap.hidden = true;
    if (track) {
      track.removeAttribute('aria-valuenow');
    }
    return;
  }
  wrap.hidden = false;
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  fill.style.width = `${p}%`;
  if (track) track.setAttribute('aria-valuenow', String(p));
  if (label) label.textContent = labelText || '';
}

async function apiCommitSeries(section, cover, items, title, description) {
  const r = await fetch('/api/gallery-commit-series', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
    },
    body: JSON.stringify({ section, cover, items, title, description })
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
    .map((d) => `<tr><td>${d.date}</td><td class="num">${d.count}</td></tr>`)
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

function fillSiteContentForm(content) {
  SITE_CONTENT_FIELDS.forEach(([key, id]) => {
    const el = $(id);
    if (!el) return;
    el.value = typeof content?.[key] === 'string' ? content[key] : '';
  });
}

function setTab(active) {
  const mainBtn = $('tab-main-btn');
  const visualBtn = $('tab-visual-btn');
  const mainPanel = $('tab-main');
  const visualPanel = $('tab-visual');
  const showVisual = active === 'visual';
  if (mainBtn) {
    mainBtn.classList.toggle('is-active', !showVisual);
    mainBtn.setAttribute('aria-selected', String(!showVisual));
  }
  if (visualBtn) {
    visualBtn.classList.toggle('is-active', showVisual);
    visualBtn.setAttribute('aria-selected', String(showVisual));
  }
  if (mainPanel) mainPanel.hidden = showVisual;
  if (visualPanel) visualPanel.hidden = !showVisual;
}

function contentToPlainText(key, value) {
  if (typeof value !== 'string') return '';
  if (key === 'aboutTitleHtml') {
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?[^>]+>/g, '')
      .trim();
  }
  return value;
}

function fillVisualEditor(content) {
  const nodes = document.querySelectorAll('[data-content-key]');
  nodes.forEach((node) => {
    const key = node.getAttribute('data-content-key');
    if (!key) return;
    const raw = contentToPlainText(key, content?.[key] ?? '');
    if (node.tagName === 'BUTTON') node.textContent = raw || 'Кнопка';
    else node.textContent = raw;
  });
}

function readSiteContentForm() {
  const content = {};
  SITE_CONTENT_FIELDS.forEach(([key, id]) => {
    const el = $(id);
    content[key] = (el?.value || '').trim();
  });
  return content;
}

async function loadSiteContentData() {
  const msgEl = $('dash-msg');
  try {
    const data = await apiSiteContent();
    siteContentCache = data.content || {};
    fillSiteContentForm(siteContentCache);
    fillVisualEditor(siteContentCache);
  } catch (e) {
    setMsg(msgEl, `Не удалось загрузить поля сайта: ${e.message || e}`, 'err');
  }
}

function readVisualEditorContent() {
  const next = { ...(siteContentCache || {}) };
  document.querySelectorAll('[data-content-key]').forEach((node) => {
    const key = node.getAttribute('data-content-key');
    if (!key || !VISUAL_TEXT_KEYS.includes(key)) return;
    const text = (node.textContent || '').trim();
    if (key === 'aboutTitleHtml') {
      next[key] = escapeHtml(text).replace(/\r?\n/g, '<br>');
      return;
    }
    next[key] = text;
  });
  return next;
}

async function saveSiteContentData() {
  const msgEl = $('dash-msg');
  const btn = $('btn-content-save');
  try {
    if (btn) btn.disabled = true;
    setMsg(msgEl, 'Сохранение полей сайта…');
    const payload = readSiteContentForm();
    await apiSiteContentSave(payload);
    siteContentCache = payload;
    setMsg(msgEl, 'Поля сайта сохранены. Обновите страницу сайта, чтобы увидеть изменения.', 'ok');
  } catch (e) {
    setMsg(msgEl, `Ошибка сохранения полей сайта: ${e.message || e}`, 'err');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function saveVisualEditorData() {
  const msgEl = $('dash-msg');
  const btn = $('btn-visual-save');
  try {
    if (btn) btn.disabled = true;
    setMsg(msgEl, 'Обновление текста…');
    const payload = readVisualEditorContent();
    await apiSiteContentSave(payload);
    siteContentCache = payload;
    fillSiteContentForm(siteContentCache);
    fillVisualEditor(siteContentCache);
    setMsg(msgEl, 'Текст обновлён. Обновите страницу сайта, чтобы увидеть изменения.', 'ok');
  } catch (e) {
    setMsg(msgEl, `Ошибка обновления текста: ${e.message || e}`, 'err');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function updateBulkDeleteState() {
  const n = document.querySelectorAll('#gallery-manage-list .gallery-manage-cb:checked').length;
  const btn = $('btn-bulk-delete');
  if (btn) btn.disabled = n === 0;
}

async function persistReorder(list) {
  const section = manageSection();
  const rows = [...list.querySelectorAll('.gallery-manage-row')];
  const order = rows.map((r) => Number(r.dataset.index));
  const msgEl = $('dash-msg');
  setMsg(msgEl, 'Сохранение порядка…');
  try {
    await apiGalleryMutate({ action: 'reorder', section, order });
    setMsg(msgEl, 'Порядок сохранён. Изменения уже применены на сайте.', 'ok');
    await loadGalleryData();
  } catch (e) {
    setMsg(msgEl, e.message || String(e), 'err');
    await loadGalleryData();
  }
}

function bindManageDnD(list) {
  let dragged = null;

  list.querySelectorAll('.gallery-manage-row').forEach((row) => {
    row.setAttribute('draggable', 'true');

    row.addEventListener('dragstart', (e) => {
      if (e.target.closest('input, button, textarea, summary')) {
        e.preventDefault();
        return;
      }
      dragged = row;
      row.classList.add('is-dragging');
      try {
        e.dataTransfer.setData('text/plain', row.dataset.index || '');
        e.dataTransfer.effectAllowed = 'move';
      } catch {
        /* ignore */
      }
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('is-dragging');
      dragged = null;
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      try {
        e.dataTransfer.dropEffect = 'move';
      } catch {
        /* ignore */
      }
    });

    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (!dragged || dragged === row) return;
      const parent = row.parentNode;
      const rect = row.getBoundingClientRect();
      const after = e.clientY - rect.top > rect.height / 2;
      if (after) parent.insertBefore(dragged, row.nextSibling);
      else parent.insertBefore(dragged, row);
      await persistReorder(list);
    });
  });
}

function renderGalleryManage() {
  const section = manageSection();
  const list = $('gallery-manage-list');
  if (!list) return;
  const entries = galleryCache[section] || [];
  if (!entries.length) {
    list.innerHTML = '<p class="hint">В этом разделе пока пусто.</p>';
    updateBulkDeleteState();
    return;
  }

  list.innerHTML = entries
    .map((entry, index) => {
      const prev = previewPath(entry);
      const src = prev ? `/${prev.replace(/^\//, '')}` : '';
      const label = entryLabel(entry);
      const { title, description } = entryTitleDesc(entry);
      const t = escapeHtml(title);
      const d = escapeHtml(description);
      return `
        <div class="gallery-manage-row" data-index="${index}" data-section="${section}">
          <input type="checkbox" class="gallery-manage-cb" data-index="${index}" aria-label="Выбрать элемент ${index + 1}" />
          <div class="gallery-manage-thumb-wrap">
            ${src ? `<img class="gallery-manage-thumb" src="${src}" alt="" loading="lazy" />` : '<div class="gallery-manage-ph"></div>'}
          </div>
          <div class="gallery-manage-meta">
            <span class="gallery-manage-label">#${index + 1} · ${label}</span>
            <span class="gallery-manage-path">${escapeHtml(prev || '—')}</span>
            <details class="gallery-manage-expand">
              <summary>Подпись и SEO</summary>
              <label class="label mini">Заголовок</label>
              <input type="text" class="input input-compact meta-title" value="${t}" maxlength="200" />
              <label class="label mini">Описание</label>
              <textarea class="input input-compact meta-desc" rows="2" maxlength="2000">${d}</textarea>
              <button type="button" class="btn btn-mini btn-ghost" data-act="save-meta">Сохранить подпись</button>
            </details>
          </div>
          <div class="gallery-manage-actions">
            <button type="button" class="btn btn-mini btn-danger" data-act="del" aria-label="Удалить">Удалить</button>
          </div>
        </div>`;
    })
    .join('');

  bindManageDnD(list);

  list.querySelectorAll('.gallery-manage-cb').forEach((cb) => {
    cb.addEventListener('change', updateBulkDeleteState);
  });

  list.querySelectorAll('button[data-act]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.gallery-manage-row');
      const index = Number(row?.dataset.index);
      const sec = row?.dataset.section || manageSection();
      if (Number.isNaN(index)) return;
      const act = btn.dataset.act;
      const msgEl = $('dash-msg');

      if (act === 'save-meta') {
        const titleIn = row?.querySelector('.meta-title');
        const descIn = row?.querySelector('.meta-desc');
        try {
          setMsg(msgEl, 'Сохранение подписи…');
          await apiGalleryMutate({
            action: 'updateMeta',
            section: sec,
            index,
            title: titleIn?.value ?? '',
            description: descIn?.value ?? ''
          });
          setMsg(msgEl, 'Подпись сохранена. Изменения уже применены на сайте.', 'ok');
          await loadGalleryData();
        } catch (e) {
          setMsg(msgEl, e.message || String(e), 'err');
        }
        return;
      }

      try {
        if (act === 'del') {
          if (!confirm(`Удалить элемент #${index + 1} из ${sec}?`)) return;
          setMsg(msgEl, 'Удаление…');
          await apiGalleryMutate({ action: 'delete', section: sec, index });
        }
        setMsg(msgEl, 'Готово. Изменения уже применены на сайте.', 'ok');
        await loadGalleryData();
      } catch (e) {
        setMsg(msgEl, e.message || String(e), 'err');
      }
    });
  });

  updateBulkDeleteState();
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
  const titleEl = $('series-title');
  const descEl = $('series-desc');

  const coverFile = coverInput.files?.[0];
  if (!coverFile) {
    setMsg(msgEl, 'Выберите обложку или одно фото', 'err');
    return;
  }

  const moreFiles = Array.from(moreInput.files || []);
  const totalFiles = 1 + moreFiles.length;

  btn.disabled = true;
  setUploadProgress(true, 0, 'Загрузка файлов…');

  try {
    let doneFiles = 0;
    const coverRes = await uploadBlobWithProgress(section, coverFile, (r) => {
      const overall = ((doneFiles + r) / totalFiles) * 100;
      setUploadProgress(
        true,
        overall,
        `Файл 1 из ${totalFiles}: обложка (${coverFile.name})`
      );
    });
    doneFiles += 1;
    setUploadProgress(true, (doneFiles / totalFiles) * 100, `Обложка загружена`);
    const cover = { full: coverRes.path, thumb: coverRes.thumbPath };

    const items = [];
    for (let i = 0; i < moreFiles.length; i++) {
      const f = moreFiles[i];
      const fi = i + 2;
      const res = await uploadBlobWithProgress(section, f, (r) => {
        const overall = ((doneFiles + r) / totalFiles) * 100;
        setUploadProgress(true, overall, `Файл ${fi} из ${totalFiles}: ${f.name}`);
      });
      items.push({ full: res.path, thumb: res.thumbPath });
      doneFiles += 1;
      setUploadProgress(true, (doneFiles / totalFiles) * 100, `Готово ${fi} из ${totalFiles}`);
    }

    setUploadProgress(true, 95, 'Запись в gallery.json…');
    await apiCommitSeries(section, cover, items, titleEl?.value || '', descEl?.value || '');

    setUploadProgress(true, 100, 'Готово');
    setMsg(
      msgEl,
      `Готово: ${items.length ? `серия из ${items.length + 1} фото` : 'одно фото'}. Сайт обновлён.`,
      'ok'
    );
    coverInput.value = '';
    moreInput.value = '';
    if (titleEl) titleEl.value = '';
    if (descEl) descEl.value = '';
    await loadGalleryData();
  } catch (e) {
    setMsg(msgEl, e.message || String(e), 'err');
  } finally {
    btn.disabled = false;
    setUploadProgress(false, 0, '');
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
      await loadSiteContentData();
    } else {
      showLogin();
    }
  } catch {
    setMsg(boot, 'Не удалось связаться с API. Проверьте, что PHP-эндпоинты /api работают на хостинге.', 'err');
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
        await loadSiteContentData();
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
  $('tab-main-btn')?.addEventListener('click', () => setTab('main'));
  $('tab-visual-btn')?.addEventListener('click', () => setTab('visual'));
  $('btn-content-reload')?.addEventListener('click', async () => {
    setMsg($('dash-msg'), 'Загрузка полей сайта…');
    await loadSiteContentData();
    setMsg($('dash-msg'), 'Поля сайта обновлены', 'ok');
  });
  $('btn-content-save')?.addEventListener('click', async () => {
    await saveSiteContentData();
  });
  $('btn-visual-reload')?.addEventListener('click', async () => {
    setMsg($('dash-msg'), 'Загрузка мини-редактора…');
    await loadSiteContentData();
    setMsg($('dash-msg'), 'Мини-редактор обновлён', 'ok');
  });
  $('btn-visual-save')?.addEventListener('click', async () => {
    await saveVisualEditorData();
  });

  document.querySelectorAll('input[name="manage-section"]').forEach((r) => {
    r.addEventListener('change', () => renderGalleryManage());
  });

  $('btn-refresh-gallery')?.addEventListener('click', async () => {
    setMsg($('dash-msg'), 'Обновление…');
    await loadGalleryData();
    setMsg($('dash-msg'), 'Список обновлён', 'ok');
  });

  $('btn-bulk-delete')?.addEventListener('click', async () => {
    const section = manageSection();
    const selected = [
      ...document.querySelectorAll('#gallery-manage-list .gallery-manage-cb:checked')
    ].map((cb) => Number(cb.dataset.index));
    if (!selected.length) return;
    if (!confirm(`Удалить ${selected.length} элемент(ов) из ${section}?`)) return;
    const msgEl = $('dash-msg');
    setMsg(msgEl, 'Удаление…');
    try {
      await apiGalleryMutate({ action: 'deleteMany', section, indices: selected });
      setMsg(msgEl, 'Удалено. Изменения уже применены на сайте.', 'ok');
      await loadGalleryData();
    } catch (e) {
      setMsg(msgEl, e.message || String(e), 'err');
    }
  });

  $('btn-clear-section')?.addEventListener('click', async () => {
    const section = manageSection();
    if (
      !confirm(
        `Очистить весь раздел «${section === 'auto' ? 'Авто' : 'Люди'}»? Все записи и файлы изображений будут удалены с хостинга.`
      )
    ) {
      return;
    }
    const msgEl = $('dash-msg');
    setMsg(msgEl, 'Очистка раздела…');
    try {
      await apiGalleryMutate({ action: 'clearSection', section });
      setMsg(msgEl, 'Раздел очищен. Изменения уже применены на сайте.', 'ok');
      await loadGalleryData();
    } catch (e) {
      setMsg(msgEl, e.message || String(e), 'err');
    }
  });
});
