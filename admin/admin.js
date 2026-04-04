const $ = (id) => document.getElementById(id);
let csrfToken = '';

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

/** Загрузка файла в репозиторий без изменения gallery.json */
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
    if (s.ok) showDash();
    else showLogin();
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
});
