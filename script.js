const config = {
  autoCount: 49,
  peopleCount: 15
};

/** 1×1 прозрачный GIF — валидный src до подгрузки реального файла */
const IMG_PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

let lastFocusedThumb = null;
let galleryManifestCache = null;
let galleryImageObserver = null;
let staggerFallbackMs = 0;

function showSection(id) {
  document.querySelectorAll('.content-section').forEach((s) => s.classList.remove('active'));

  const target = document.getElementById(id + '-section') || document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
}

function altForGallery(folder, index) {
  if (folder === 'auto') {
    return `Автомобильная съёмка, кадр ${index}`;
  }
  if (folder === 'people') {
    return `Репортажная съёмка, кадр ${index}`;
  }
  return `Фотография ${index}`;
}

function openLightbox(src, alt) {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  lbImg.src = src;
  lbImg.alt = alt || '';
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('lightbox-close').focus();
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.hidden = true;
  const lbImg = document.getElementById('lb-img');
  lbImg.removeAttribute('src');
  lbImg.alt = '';
  document.body.style.overflow = '';

  if (lastFocusedThumb && typeof lastFocusedThumb.focus === 'function') {
    lastFocusedThumb.focus();
  }
}

function normalizePath(src) {
  if (!src || typeof src !== 'string') return '';
  return src.replace(/^\//, '');
}

function normalizeManifestList(entries) {
  if (!Array.isArray(entries)) return [];
  const out = [];
  entries.forEach((item) => {
    const raw = typeof item === 'string' ? item : item && (item.image || item.src);
    const path = normalizePath(raw);
    if (path) out.push(path);
  });
  return out;
}

async function loadGalleryManifest() {
  if (galleryManifestCache) return galleryManifestCache;
  try {
    const manifestUrl = new URL('gallery.json', window.location.href).href;
    const res = await fetch(manifestUrl);
    if (!res.ok) throw new Error('gallery.json not ok');
    galleryManifestCache = await res.json();
    return galleryManifestCache;
  } catch {
    return null;
  }
}

function createGalleryImageObserver() {
  if (!('IntersectionObserver' in window)) return null;
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const full = el.dataset.fullSrc;
        if (!full) {
          galleryImageObserver.unobserve(el);
          return;
        }
        if (el.dataset.imageReady === '1') {
          galleryImageObserver.unobserve(el);
          return;
        }
        el.dataset.imageReady = '1';
        el.src = full;
        galleryImageObserver.unobserve(el);
      });
    },
    {
      root: null,
      rootMargin: '120px 0px 280px 0px',
      threshold: 0.01
    }
  );
}

function appendGalleryThumb(grid, fullSrc, alt) {
  const img = document.createElement('img');
  img.className = 'gallery-thumb';
  img.alt = alt;
  img.decoding = 'async';
  img.dataset.fullSrc = fullSrc;
  img.src = IMG_PLACEHOLDER;

  img.addEventListener('click', function () {
    const url = this.dataset.fullSrc;
    if (!url || this.dataset.imageReady !== '1') return;
    lastFocusedThumb = this;
    openLightbox(url, this.alt);
  });

  img.onerror = function () {
    if (galleryImageObserver) {
      try {
        galleryImageObserver.unobserve(this);
      } catch (_) {
        /* ignore */
      }
    }
    this.remove();
  };

  grid.appendChild(img);

  if (galleryImageObserver) {
    galleryImageObserver.observe(img);
  } else {
    const delay = staggerFallbackMs;
    staggerFallbackMs += 50;
    setTimeout(() => {
      if (!img.isConnected) return;
      img.dataset.imageReady = '1';
      img.src = fullSrc;
    }, delay);
  }
}

function loadGridLegacy(containerId, folder, maxCount) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  staggerFallbackMs = 0;
  grid.innerHTML = '';

  for (let i = 1; i <= maxCount; i++) {
    appendGalleryThumb(grid, `img/${folder}/${i}.webp`, altForGallery(folder, i));
  }
}

function loadGridFromPaths(containerId, folderKey, paths) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  staggerFallbackMs = 0;
  grid.innerHTML = '';

  paths.forEach((src, i) => {
    appendGalleryThumb(grid, src, altForGallery(folderKey, i + 1));
  });
}

async function runAutoGallery() {
  showSection('auto');
  try {
    const m = await loadGalleryManifest();
    const paths = m ? normalizeManifestList(m.auto) : [];
    if (paths.length) {
      loadGridFromPaths('auto-grid', 'auto', paths);
    } else {
      loadGridLegacy('auto-grid', 'auto', config.autoCount);
    }
  } catch {
    loadGridLegacy('auto-grid', 'auto', config.autoCount);
  }
}

async function runPeopleGallery() {
  showSection('people');
  try {
    const m = await loadGalleryManifest();
    const paths = m ? normalizeManifestList(m.people) : [];
    if (paths.length) {
      loadGridFromPaths('people-grid', 'people', paths);
    } else {
      loadGridLegacy('people-grid', 'people', config.peopleCount);
    }
  } catch {
    loadGridLegacy('people-grid', 'people', config.peopleCount);
  }
}

function showAuto() {
  void runAutoGallery().catch(() => {
    loadGridLegacy('auto-grid', 'auto', config.autoCount);
  });
}

function showPeople() {
  void runPeopleGallery().catch(() => {
    loadGridLegacy('people-grid', 'people', config.peopleCount);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  galleryImageObserver = createGalleryImageObserver();

  showSection('main');

  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const closeBtn = document.getElementById('lightbox-close');

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  closeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    closeLightbox();
  });

  lbImg.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lightbox.hidden) {
      closeLightbox();
    }
  });
});
