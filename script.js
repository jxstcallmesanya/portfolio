const config = {
  autoCount: 49,
  peopleCount: 15
};

/** 1×1 прозрачный GIF — валидный src до подгрузки реального файла */
const IMG_PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

let lastFocusedThumb = null;
let galleryManifestCache = null;
let galleryLoadObserver = null;
let galleryUnloadObserver = null;
let staggerFallbackMs = 0;

/** Узкие экраны и iOS / iPadOS — агрессивнее экономим память */
function isMemoryConstrainedDevice() {
  return (
    window.matchMedia('(max-width: 768px)').matches ||
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

let maxConcurrentGalleryLoads = 8;
let galleryLoadInflight = 0;
const galleryLoadWaitQueue = [];

function processGalleryLoadQueue() {
  while (galleryLoadInflight < maxConcurrentGalleryLoads && galleryLoadWaitQueue.length) {
    const job = galleryLoadWaitQueue.shift();
    if (!job || !job.img.isConnected) continue;
    startGalleryImageNetworkLoad(job.img, job.fullSrc);
  }
}

function startGalleryImageNetworkLoad(img, fullSrc) {
  galleryLoadInflight++;

  const finish = () => {
    galleryLoadInflight--;
    processGalleryLoadQueue();
  };

  const onLoad = () => {
    if (!img.isConnected) {
      finish();
      return;
    }
    img.dataset.imageReady = '1';
    if (galleryLoadObserver) {
      try {
        galleryLoadObserver.unobserve(img);
      } catch (_) {
        /* ignore */
      }
    }
    if (galleryUnloadObserver) {
      try {
        galleryUnloadObserver.observe(img);
      } catch (_) {
        /* ignore */
      }
    }
    finish();
  };

  const onError = () => {
    if (galleryLoadObserver) {
      try {
        galleryLoadObserver.unobserve(img);
      } catch (_) {
        /* ignore */
      }
    }
    if (galleryUnloadObserver) {
      try {
        galleryUnloadObserver.unobserve(img);
      } catch (_) {
        /* ignore */
      }
    }
    if (img.isConnected) {
      img.closest('.gallery-item')?.remove();
    }
    finish();
  };

  img.addEventListener('load', onLoad, { once: true });
  img.addEventListener('error', onError, { once: true });
  img.src = fullSrc;
}

function requestGalleryImageLoad(img, fullSrc) {
  if (img.dataset.imageReady === '1' || img.dataset.loadQueued === '1') return;
  img.dataset.loadQueued = '1';

  if (galleryLoadInflight < maxConcurrentGalleryLoads) {
    startGalleryImageNetworkLoad(img, fullSrc);
  } else {
    galleryLoadWaitQueue.push({ img, fullSrc });
  }
}

function teardownGalleryImage(img) {
  const pendingUnload = unloadDebounceTimers.get(img);
  if (pendingUnload) {
    clearTimeout(pendingUnload);
    unloadDebounceTimers.delete(img);
  }
  if (galleryUnloadObserver) {
    try {
      galleryUnloadObserver.unobserve(img);
    } catch (_) {
      /* ignore */
    }
  }
  img.dataset.imageReady = '0';
  img.dataset.loadQueued = '0';
  img.removeAttribute('src');
  img.src = IMG_PLACEHOLDER;
  if (galleryLoadObserver) {
    try {
      galleryLoadObserver.observe(img);
    } catch (_) {
      /* ignore */
    }
  }
}

let unloadDebounceTimers = new WeakMap();

function createGalleryLoadObserver() {
  if (!('IntersectionObserver' in window)) return null;

  const tight = isMemoryConstrainedDevice();
  const rootMargin = tight ? '32px 0px 100px 0px' : '80px 0px 160px 0px';

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const full = img.dataset.fullSrc;
        if (!full) return;
        if (img.dataset.imageReady === '1') return;
        requestGalleryImageLoad(img, full);
      });
    },
    { root: null, rootMargin, threshold: 0.01 }
  );
}

function createGalleryUnloadObserver() {
  if (!('IntersectionObserver' in window)) return null;
  if (!isMemoryConstrainedDevice()) return null;

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const img = entry.target;
        if (img.dataset.imageReady !== '1') return;

        if (entry.isIntersecting) {
          const t = unloadDebounceTimers.get(img);
          if (t) {
            clearTimeout(t);
            unloadDebounceTimers.delete(img);
          }
          return;
        }

        if (unloadDebounceTimers.has(img)) return;

        const timer = setTimeout(() => {
          unloadDebounceTimers.delete(img);
          if (!img.isConnected || img.dataset.imageReady !== '1') return;
          teardownGalleryImage(img);
        }, 900);

        unloadDebounceTimers.set(img, timer);
      });
    },
    { root: null, rootMargin: '0px', threshold: 0 }
  );
}

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

function clearGalleryQueues() {
  galleryLoadWaitQueue.length = 0;
  galleryLoadInflight = 0;
}

function appendGalleryThumb(grid, fullSrc, alt) {
  const item = document.createElement('div');
  item.className = 'gallery-item';

  const img = document.createElement('img');
  img.className = 'gallery-thumb';
  img.alt = alt;
  img.decoding = 'async';
  img.loading = 'eager';
  img.dataset.fullSrc = fullSrc;
  img.dataset.imageReady = '0';
  img.dataset.loadQueued = '0';
  img.src = IMG_PLACEHOLDER;

  img.addEventListener('click', function () {
    const url = this.dataset.fullSrc;
    if (!url || this.dataset.imageReady !== '1') return;
    lastFocusedThumb = this;
    openLightbox(url, this.alt);
  });

  item.appendChild(img);
  grid.appendChild(item);

  if (galleryLoadObserver) {
    galleryLoadObserver.observe(img);
  } else {
    const delay = staggerFallbackMs;
    staggerFallbackMs += 120;
    setTimeout(() => {
      if (!img.isConnected) return;
      requestGalleryImageLoad(img, fullSrc);
    }, delay);
  }
}

function loadGridLegacy(containerId, folder, maxCount) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  clearGalleryQueues();
  staggerFallbackMs = 0;
  grid.innerHTML = '';

  for (let i = 1; i <= maxCount; i++) {
    appendGalleryThumb(grid, `img/${folder}/${i}.webp`, altForGallery(folder, i));
  }
}

function loadGridFromPaths(containerId, folderKey, paths) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  clearGalleryQueues();
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
  maxConcurrentGalleryLoads = isMemoryConstrainedDevice() ? 2 : 8;

  galleryLoadObserver = createGalleryLoadObserver();
  galleryUnloadObserver = createGalleryUnloadObserver();

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
