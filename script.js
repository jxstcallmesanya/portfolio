const config = { autoCount: 49, peopleCount: 15 };

const IMG_PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const SECTION_TO_HASH = {
  main: '#gallery',
  about: '#about',
  cases: '#cases',
  packages: '#packages',
  faq: '#faq',
  contact: '#contact',
  auto: '#auto',
  people: '#people'
};

const HASH_TO_SECTION = {
  '#': 'main',
  '#main': 'main',
  '#gallery': 'main',
  '#about': 'about',
  '#cases': 'cases',
  '#packages': 'packages',
  '#faq': 'faq',
  '#contact': 'contact',
  '#auto': 'auto',
  '#people': 'people'
};

const NAV_SECTION_MAP = {
  auto: 'main',
  people: 'main'
};

let galleryManifestCache = null;
let galleryLoadObserver = null;
let galleryUnloadObserver = null;
let staggerFallbackMs = 0;
let maxConcurrentGalleryLoads = 8;
let galleryLoadInflight = 0;

const galleryLoadWaitQueue = [];
const galleryRendered = { auto: false, people: false };
const galleryEntries = { auto: [], people: [] };
const unloadDebounceTimers = new WeakMap();

let lastFocusedThumb = null;
let lightboxGalleryKey = null;
let lightboxIndex = -1;
let currentSectionId = 'main';

function isMemoryConstrainedDevice() {
  return (
    window.matchMedia('(max-width: 768px)').matches ||
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isLikelyIOSWebKit() {
  const ua = navigator.userAgent || '';
  const iOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /AppleWebKit/i.test(ua);
  const chromium = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return iOS && webkit && !chromium;
}

function trackEvent(name, label, extra = {}) {
  const payload = { event: name, label: label || '', ...extra };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'portfolio_event', ...payload });

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, { event_label: label || '', ...extra });
  }
  if (typeof window.plausible === 'function') {
    window.plausible(name, { props: { label: label || '', ...extra } });
  }
}

function normalizeHash(rawHash) {
  const normalized = (rawHash || '#gallery').toLowerCase();
  return HASH_TO_SECTION[normalized] ? normalized : '#gallery';
}

function sectionFromHash(rawHash) {
  return HASH_TO_SECTION[normalizeHash(rawHash)] || 'main';
}

function updateActiveNav(sectionId) {
  const navSection = NAV_SECTION_MAP[sectionId] || sectionId;
  document.querySelectorAll('.nav-btn[data-nav-target]').forEach((btn) => {
    const isActive = btn.dataset.navTarget === navSection;
    btn.classList.toggle('is-active', isActive);
    if (isActive) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
}

function showSection(sectionId) {
  const prevSectionId = currentSectionId;
  if (prevSectionId && prevSectionId !== sectionId) {
    releaseSectionMemory(prevSectionId);
  }
  document.querySelectorAll('.content-section').forEach((s) => s.classList.remove('active'));
  const target = document.getElementById(`${sectionId}-section`);
  if (!target) return;
  target.classList.add('active');
  updateActiveNav(sectionId);
  currentSectionId = sectionId;
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function navigateToSection(sectionId) {
  const nextHash = SECTION_TO_HASH[sectionId] || '#gallery';
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
    return;
  }
  void routeByHash('same_hash');
}

function altForGallery(folder, index) {
  if (folder === 'auto') return `Автомобильная съёмка, кадр ${index}`;
  if (folder === 'people') return `Репортажная съёмка, кадр ${index}`;
  return `Фотография ${index}`;
}

function normalizePath(src) {
  if (!src || typeof src !== 'string') return '';
  return src.replace(/^\//, '');
}

function normalizeSrcset(srcset) {
  if (typeof srcset !== 'string') return '';
  return srcset.trim();
}

function normalizeManifestEntry(item) {
  if (typeof item === 'string') {
    const fullSrc = normalizePath(item);
    if (!fullSrc) return null;
    return { fullSrc, thumbSrc: fullSrc, srcset: '', sizes: '', width: null, height: null };
  }

  if (!item || typeof item !== 'object') return null;

  const fullSrc = normalizePath(item.full || item.src || item.image || item.original);
  if (!fullSrc) return null;

  const thumbSrc = normalizePath(item.thumb || item.preview || fullSrc) || fullSrc;
  const srcset = normalizeSrcset(item.srcset);
  const sizes = typeof item.sizes === 'string' ? item.sizes : '';
  const width = Number.isFinite(Number(item.width)) ? Number(item.width) : null;
  const height = Number.isFinite(Number(item.height)) ? Number(item.height) : null;

  return { fullSrc, thumbSrc, srcset, sizes, width, height };
}

function normalizeManifestList(entries, fallbackFolder, fallbackCount) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return Array.from({ length: fallbackCount }, (_, i) => {
      const fullSrc = `img/${fallbackFolder}/${i + 1}.webp`;
      return { fullSrc, thumbSrc: fullSrc, srcset: '', sizes: '', width: null, height: null };
    });
  }

  const normalized = [];
  entries.forEach((item) => {
    const entry = normalizeManifestEntry(item);
    if (entry) normalized.push(entry);
  });
  return normalized;
}

function entryFromDataset(img) {
  return {
    fullSrc: img.dataset.fullSrc || '',
    thumbSrc: img.dataset.thumbSrc || img.dataset.fullSrc || '',
    srcset: img.dataset.srcset || '',
    sizes: img.dataset.sizes || ''
  };
}

function releaseSectionMemory(sectionId) {
  if (sectionId !== 'auto' && sectionId !== 'people') return;
  const grid = document.getElementById(`${sectionId}-grid`);
  if (!grid) return;
  grid.querySelectorAll('.gallery-thumb').forEach((img) => teardownGalleryImage(img));
  clearGalleryQueues();
}

function processGalleryLoadQueue() {
  while (galleryLoadInflight < maxConcurrentGalleryLoads && galleryLoadWaitQueue.length) {
    const job = galleryLoadWaitQueue.shift();
    if (!job || !job.img.isConnected) continue;
    startGalleryImageNetworkLoad(job.img, job.entry);
  }
}

function startGalleryImageNetworkLoad(img, entry) {
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
    img.dataset.loadQueued = '0';
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
    const canRetryWithFull =
      img.dataset.usedFullFallback !== '1' &&
      entry.thumbSrc &&
      entry.fullSrc &&
      entry.thumbSrc !== entry.fullSrc;

    if (canRetryWithFull) {
      img.dataset.usedFullFallback = '1';
      img.dataset.loadQueued = '0';
      finish();
      requestGalleryImageLoad(img, {
        fullSrc: entry.fullSrc,
        thumbSrc: entry.fullSrc,
        srcset: '',
        sizes: ''
      });
      return;
    }

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

  if (entry.srcset) img.setAttribute('srcset', entry.srcset);
  else img.removeAttribute('srcset');

  if (entry.sizes) img.setAttribute('sizes', entry.sizes);
  else img.removeAttribute('sizes');

  img.src = entry.thumbSrc || entry.fullSrc;
}

function requestGalleryImageLoad(img, entry) {
  if (img.dataset.imageReady === '1' || img.dataset.loadQueued === '1') return;
  img.dataset.loadQueued = '1';

  if (galleryLoadInflight < maxConcurrentGalleryLoads) {
    startGalleryImageNetworkLoad(img, entry);
  } else {
    galleryLoadWaitQueue.push({ img, entry });
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
  img.dataset.usedFullFallback = '0';
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
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

function createGalleryLoadObserver() {
  if (!('IntersectionObserver' in window)) return null;

  const tight = isMemoryConstrainedDevice();
  const rootMargin = tight ? '48px 0px 110px 0px' : '120px 0px 220px 0px';

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const data = entryFromDataset(img);
        if (!data.fullSrc) return;
        if (img.dataset.imageReady === '1') return;
        requestGalleryImageLoad(img, data);
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

async function loadGalleryManifest() {
  if (galleryManifestCache) return galleryManifestCache;
  try {
    const manifestUrl = new URL('gallery.json', window.location.href).href;
    const res = await fetch(manifestUrl, { cache: 'no-cache' });
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

function getMobileInitialLimit() {
  if (!isMemoryConstrainedDevice()) return null;
  return isLikelyIOSWebKit() ? 18 : 24;
}

function updateLoadMoreVisibility(galleryKey, shownCount, totalCount) {
  const btn = document.getElementById(`${galleryKey}-load-more`);
  if (!btn) return;
  btn.hidden = shownCount >= totalCount;
}

function updateLightboxNavButtons() {
  const prev = document.getElementById('lightbox-prev');
  const next = document.getElementById('lightbox-next');
  const items = galleryEntries[lightboxGalleryKey] || [];

  const hasPrev = lightboxIndex > 0;
  const hasNext = lightboxIndex >= 0 && lightboxIndex < items.length - 1;
  prev.disabled = !hasPrev;
  next.disabled = !hasNext;
}

function renderLightboxImage() {
  const lbImg = document.getElementById('lb-img');
  const items = galleryEntries[lightboxGalleryKey] || [];
  const current = items[lightboxIndex];
  if (!current) return;

  lbImg.src = current.fullSrc;
  lbImg.alt = altForGallery(lightboxGalleryKey, lightboxIndex + 1);
  updateLightboxNavButtons();
}

function openLightboxAt(galleryKey, index, triggerEl) {
  const items = galleryEntries[galleryKey] || [];
  if (!items[index]) return;

  lastFocusedThumb = triggerEl || document.activeElement;
  lightboxGalleryKey = galleryKey;
  lightboxIndex = index;

  const lb = document.getElementById('lightbox');
  lb.hidden = false;
  document.body.style.overflow = 'hidden';

  renderLightboxImage();
  document.getElementById('lightbox-close').focus();
  trackEvent('lightbox_open', galleryKey, { index: index + 1 });
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.hidden = true;
  const lbImg = document.getElementById('lb-img');
  lbImg.removeAttribute('src');
  lbImg.alt = '';
  document.body.style.overflow = '';
  lightboxGalleryKey = null;
  lightboxIndex = -1;

  if (lastFocusedThumb && typeof lastFocusedThumb.focus === 'function') {
    lastFocusedThumb.focus();
  }
}

function showPrevInLightbox() {
  if (lightboxIndex <= 0) return;
  lightboxIndex -= 1;
  renderLightboxImage();
}

function showNextInLightbox() {
  const items = galleryEntries[lightboxGalleryKey] || [];
  if (lightboxIndex >= items.length - 1) return;
  lightboxIndex += 1;
  renderLightboxImage();
}

function trapLightboxFocus(e) {
  const lb = document.getElementById('lightbox');
  if (lb.hidden || e.key !== 'Tab') return;

  const focusables = Array.from(
    lb.querySelectorAll('button:not([disabled])')
  );
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function appendGalleryThumb(grid, galleryKey, entry, index) {
  const item = document.createElement('div');
  item.className = 'gallery-item';

  const img = document.createElement('img');
  img.className = 'gallery-thumb';
  img.alt = altForGallery(galleryKey, index + 1);
  img.decoding = 'async';
  img.loading = 'eager';
  img.tabIndex = 0;

  img.dataset.gallery = galleryKey;
  img.dataset.galleryIndex = String(index);
  img.dataset.fullSrc = entry.fullSrc;
  img.dataset.thumbSrc = entry.thumbSrc || entry.fullSrc;
  img.dataset.srcset = entry.srcset || '';
  img.dataset.sizes = entry.sizes || '';
  img.dataset.imageReady = '0';
  img.dataset.loadQueued = '0';
  img.dataset.usedFullFallback = '0';
  img.src = IMG_PLACEHOLDER;

  if (entry.width && entry.height) {
    img.width = entry.width;
    img.height = entry.height;
  }

  const openFromThumb = () => {
    if (img.dataset.imageReady !== '1') return;
    const idx = Number(img.dataset.galleryIndex);
    openLightboxAt(galleryKey, idx, img);
  };

  img.addEventListener('click', openFromThumb);
  img.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openFromThumb();
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
      requestGalleryImageLoad(img, entryFromDataset(img));
    }, delay);
  }
}

function appendGalleryBatch(containerId, galleryKey, entries, startIndex, count) {
  const grid = document.getElementById(containerId);
  if (!grid) return 0;
  const end = Math.min(startIndex + count, entries.length);
  for (let i = startIndex; i < end; i++) {
    appendGalleryThumb(grid, galleryKey, entries[i], i);
  }
  return end - startIndex;
}

function bindLoadMore(galleryKey, containerId) {
  const btn = document.getElementById(`${galleryKey}-load-more`);
  if (!btn) return;
  btn.onclick = () => {
    const rendered = Number(btn.dataset.renderedCount || '0');
    const total = galleryEntries[galleryKey].length;
    const nextChunk = isLikelyIOSWebKit() ? 12 : 18;
    appendGalleryBatch(containerId, galleryKey, galleryEntries[galleryKey], rendered, nextChunk);
    const nextRendered = Math.min(rendered + nextChunk, total);
    btn.dataset.renderedCount = String(nextRendered);
    updateLoadMoreVisibility(galleryKey, nextRendered, total);
    trackEvent('gallery_load_more', galleryKey, { rendered: nextRendered, total });
  };
}

function renderGalleryGrid(containerId, galleryKey, entries) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  clearGalleryQueues();
  staggerFallbackMs = 0;
  grid.innerHTML = '';

  galleryEntries[galleryKey] = entries;

  const mobileLimit = getMobileInitialLimit();
  const initialCount = mobileLimit == null ? entries.length : Math.min(entries.length, mobileLimit);
  appendGalleryBatch(containerId, galleryKey, entries, 0, initialCount);

  const btn = document.getElementById(`${galleryKey}-load-more`);
  if (btn) {
    btn.dataset.renderedCount = String(initialCount);
  }
  bindLoadMore(galleryKey, containerId);
  updateLoadMoreVisibility(galleryKey, initialCount, entries.length);
}

async function runAutoGallery(forceReload = false) {
  showSection('auto');
  if (galleryRendered.auto && !forceReload) return;

  try {
    const m = await loadGalleryManifest();
    const entries = normalizeManifestList(m?.auto, 'auto', config.autoCount);
    renderGalleryGrid('auto-grid', 'auto', entries);
    galleryRendered.auto = true;
  } catch {
    const fallback = normalizeManifestList([], 'auto', config.autoCount);
    renderGalleryGrid('auto-grid', 'auto', fallback);
    galleryRendered.auto = true;
  }
}

async function runPeopleGallery(forceReload = false) {
  showSection('people');
  if (galleryRendered.people && !forceReload) return;

  try {
    const m = await loadGalleryManifest();
    const entries = normalizeManifestList(m?.people, 'people', config.peopleCount);
    renderGalleryGrid('people-grid', 'people', entries);
    galleryRendered.people = true;
  } catch {
    const fallback = normalizeManifestList([], 'people', config.peopleCount);
    renderGalleryGrid('people-grid', 'people', fallback);
    galleryRendered.people = true;
  }
}

async function routeByHash(source) {
  const sectionId = sectionFromHash(window.location.hash);
  if (sectionId === 'auto') {
    await runAutoGallery();
  } else if (sectionId === 'people') {
    await runPeopleGallery();
  } else {
    showSection(sectionId);
  }
  trackEvent('section_view', sectionId, { source: source || 'unknown' });
}

document.addEventListener('DOMContentLoaded', () => {
  maxConcurrentGalleryLoads = isLikelyIOSWebKit() ? 1 : (isMemoryConstrainedDevice() ? 2 : 8);
  galleryLoadObserver = createGalleryLoadObserver();
  galleryUnloadObserver = createGalleryUnloadObserver();

  document.querySelectorAll('.split-side [data-bg]').forEach((el) => {
    const src = el.dataset.bg;
    if (!src) return;
    const i = new Image();
    i.decoding = 'async';
    i.loading = 'eager';
    i.src = src;
    i.onload = () => {
      el.style.backgroundImage = `url('${src}')`;
    };
  });

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const brandBtn = document.querySelector('[data-action="home"]');
  if (brandBtn) {
    brandBtn.addEventListener('click', () => {
      navigateToSection('main');
      trackEvent('nav_click', 'home');
    });
  }

  document.querySelectorAll('[data-nav-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.navTarget;
      if (!target) return;
      navigateToSection(target);
      trackEvent('nav_click', target);
    });
  });

  document.querySelectorAll('[data-open-gallery]').forEach((el) => {
    el.addEventListener('click', () => {
      const gallery = el.dataset.openGallery;
      if (!gallery) return;
      navigateToSection(gallery);
      trackEvent('gallery_open', gallery);
    });
  });

  document.querySelectorAll('[data-track-event]').forEach((el) => {
    el.addEventListener('click', () => {
      const eventName = el.dataset.trackEvent || 'ui_click';
      const label = el.dataset.trackLabel || '';
      trackEvent(eventName, label);
    });
  });

  if (!window.location.hash) {
    window.history.replaceState(null, '', '#gallery');
  }
  void routeByHash('init');

  window.addEventListener('hashchange', () => {
    void routeByHash('hashchange');
  });

  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeLightbox();
  });

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showPrevInLightbox();
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showNextInLightbox();
  });

  lbImg.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('keydown', (e) => {
    if (!lightbox.hidden) {
      if (e.key === 'Escape') {
        closeLightbox();
        return;
      }
      if (e.key === 'ArrowLeft') {
        showPrevInLightbox();
        return;
      }
      if (e.key === 'ArrowRight') {
        showNextInLightbox();
        return;
      }
      trapLightboxFocus(e);
    }
  });
});
