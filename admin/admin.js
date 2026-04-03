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

async function apiUpload(section, file) {
  const fd = new FormData();
  fd.append('section', section);
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

async function uploadMany(section, inputEl, msgEl) {
  const files = Array.from(inputEl.files || []);
  if (!files.length) {
    setMsg(msgEl, 'Выберите файлы', 'err');
    return;
  }

  const btnAuto = $('btn-upload-auto');
  const btnPeople = $('btn-upload-people');
  const busy = [btnAuto, btnPeople];
  busy.forEach((b) => {
    if (b) b.disabled = true;
  });

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    setMsg(msgEl, `Загрузка ${i + 1} / ${files.length}: ${f.name}…`);
    try {
      await apiUpload(section, f);
      ok++;
    } catch (e) {
      fail++;
      setMsg(msgEl, `${f.name}: ${e.message}`, 'err');
      break;
    }
  }

  if (fail === 0) {
    setMsg(
      msgEl,
      `Готово: загружено ${ok} файл(ов). Сайт обновится после деплоя Vercel (1–2 мин).`,
      'ok'
    );
    inputEl.value = '';
  }

  busy.forEach((b) => {
    if (b) b.disabled = false;
  });
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

  $('btn-upload-auto').addEventListener('click', () =>
    uploadMany('auto', $('files-auto'), $('dash-msg'))
  );

  $('btn-upload-people').addEventListener('click', () =>
    uploadMany('people', $('files-people'), $('dash-msg'))
  );
});
