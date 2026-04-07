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
let lightboxSlidesOverride = null;
let lightboxAltSection = null;
let lightboxIndex = -1;
let lastSeriesSheetOpener = null;
let currentSectionId = 'main';
let forceManualGalleryMode = false;
let lightboxScale = 1;
let lightboxTranslateX = 0;
let lightboxTranslateY = 0;
let lightboxPinchStartDistance = 0;
let lightboxPinchStartScale = 1;
let lightboxPanStartX = 0;
let lightboxPanStartY = 0;
let lightboxTouchStartX = 0;
let lightboxTouchStartY = 0;
let lightboxTouchStartTime = 0;
let lastLightboxTapTime = 0;

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

function isVeryLowMemoryMode() {
  return forceManualGalleryMode || isLikelyIOSWebKit();
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

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function isStandaloneDisplayMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (typeof navigator !== 'undefined' && navigator.standalone === true)
  );
}

function showSection(sectionId, options = {}) {
  const targetPre = document.getElementById(`${sectionId}-section`);
  if (sectionId === currentSectionId && targetPre?.classList.contains('active')) {
    return;
  }

  const runUpdate = () => {
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
  };

  const skipVt =
    options.skipTransition === true || prefersReducedMotion() || typeof document.startViewTransition !== 'function';

  if (skipVt) {
    runUpdate();
    return;
  }

  document.startViewTransition(runUpdate);
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

function normalizeFlatSlide(sub) {
  if (typeof sub === 'string') {
    const fullSrc = normalizePath(sub);
    if (!fullSrc) return null;
    return {
      fullSrc,
      thumbSrc: fullSrc,
      srcset: '',
      sizes: '',
      width: null,
      height: null,
      title: '',
      description: ''
    };
  }
  if (!sub || typeof sub !== 'object') return null;
  const fullSrc = normalizePath(sub.full || sub.src || sub.image || sub.original);
  if (!fullSrc) return null;
  const thumbSrc = normalizePath(sub.thumb || sub.preview || fullSrc) || fullSrc;
  const srcset = normalizeSrcset(sub.srcset);
  const sizes = typeof sub.sizes === 'string' ? sub.sizes : '';
  const width = Number.isFinite(Number(sub.width)) ? Number(sub.width) : null;
  const height = Number.isFinite(Number(sub.height)) ? Number(sub.height) : null;
  const title = typeof sub.title === 'string' ? sub.title.trim() : '';
  const description = typeof sub.description === 'string' ? sub.description.trim() : '';
  return { fullSrc, thumbSrc, srcset, sizes, width, height, title, description };
}

function wrapSingleSlide(slide) {
  return {
    kind: 'single',
    fullSrc: slide.fullSrc,
    thumbSrc: slide.thumbSrc,
    srcset: slide.srcset,
    sizes: slide.sizes,
    width: slide.width,
    height: slide.height,
    title: slide.title || '',
    description: slide.description || '',
    slides: [slide],
    seriesExtras: []
  };
}

function normalizeManifestEntry(item) {
  if (typeof item === 'string') {
    const slide = normalizeFlatSlide(item);
    return slide ? wrapSingleSlide(slide) : null;
  }

  if (!item || typeof item !== 'object') return null;

  if (item.cover && typeof item.cover === 'object') {
    const coverSlide = normalizeFlatSlide(item.cover);
    if (!coverSlide) return null;
    const rawItems = Array.isArray(item.items) ? item.items : [];
    const extras = [];
    rawItems.forEach((sub) => {
      const e = normalizeFlatSlide(sub);
      if (e) extras.push(e);
    });
    const slides = [coverSlide, ...extras];
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    if (extras.length === 0) {
      const single = wrapSingleSlide(coverSlide);
      if (title) single.title = title;
      if (description) single.description = description;
      return single;
    }
    return {
      kind: 'series',
      fullSrc: coverSlide.fullSrc,
      thumbSrc: coverSlide.thumbSrc,
      srcset: coverSlide.srcset,
      sizes: coverSlide.sizes,
      width: coverSlide.width,
      height: coverSlide.height,
      title,
      description,
      slides,
      seriesExtras: extras
    };
  }

  const slide = normalizeFlatSlide(item);
  if (!slide) return null;
  const wrapped = wrapSingleSlide(slide);
  const t = typeof item.title === 'string' ? item.title.trim() : '';
  const d = typeof item.description === 'string' ? item.description.trim() : '';
  if (t) wrapped.title = t;
  if (d) wrapped.description = d;
  return wrapped;
}

function normalizeManifestList(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
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

function cancelInflightImageLoad(img) {
  if (!img || img.dataset.loadingNow !== '1') return;
  img.dataset.loadingNow = '0';
  galleryLoadInflight = Math.max(0, galleryLoadInflight - 1);
}

function releaseSectionMemory(sectionId) {
  if (sectionId !== 'auto' && sectionId !== 'people') return;
  if (!isVeryLowMemoryMode()) return;
  const grid = document.getElementById(`${sectionId}-grid`);
  if (!grid) return;
  grid.querySelectorAll('.gallery-thumb').forEach((img) => {
    cancelInflightImageLoad(img);
    const pendingUnload = unloadDebounceTimers.get(img);
    if (pendingUnload) {
      clearTimeout(pendingUnload);
      unloadDebounceTimers.delete(img);
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
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.removeAttribute('src');
  });
  grid.innerHTML = '';
  galleryRendered[sectionId] = false;
  clearGalleryQueues();
  processGalleryLoadQueue();
}

function processGalleryLoadQueue() {
  while (galleryLoadInflight < maxConcurrentGalleryLoads && galleryLoadWaitQueue.length) {
    const job = galleryLoadWaitQueue.shift();
    if (!job || !job.img.isConnected) continue;
    startGalleryImageNetworkLoad(job.img, job.entry);
  }
}

function startGalleryImageNetworkLoad(img, entry) {
  if (img.dataset.loadingNow === '1') return;
  img.dataset.loadingNow = '1';
  galleryLoadInflight++;

  const finish = () => {
    if (img.dataset.loadingNow === '1') {
      img.dataset.loadingNow = '0';
      galleryLoadInflight = Math.max(0, galleryLoadInflight - 1);
    }
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
      img.dataset.imageReady = 'error';
      img.dataset.loadQueued = '0';
      img.classList.add('thumb-error');
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = IMG_PLACEHOLDER;
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
  if (
    img.dataset.imageReady === '1' ||
    img.dataset.loadQueued === '1' ||
    img.dataset.loadingNow === '1'
  ) {
    return;
  }
  img.dataset.loadQueued = '1';

  if (galleryLoadInflight < maxConcurrentGalleryLoads) {
    startGalleryImageNetworkLoad(img, entry);
  } else {
    galleryLoadWaitQueue.push({ img, entry });
  }
}

function teardownGalleryImage(img) {
  cancelInflightImageLoad(img);
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
  img.dataset.loadingNow = '0';
  img.classList.remove('thumb-error');
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
  if (isVeryLowMemoryMode()) return null;
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
  if (isVeryLowMemoryMode()) return null;
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
    const res = await fetch(manifestUrl, { cache: 'default' });
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
  return isVeryLowMemoryMode() ? 8 : 24;
}

function updateLoadMoreVisibility(galleryKey, shownCount, totalCount) {
  const btn = document.getElementById(`${galleryKey}-load-more`);
  if (!btn) return;
  btn.hidden = shownCount >= totalCount;
}

function getActiveLightboxItems() {
  if (lightboxSlidesOverride && lightboxSlidesOverride.length) {
    return lightboxSlidesOverride;
  }
  if (lightboxGalleryKey) {
    return galleryEntries[lightboxGalleryKey] || [];
  }
  return [];
}

function updateLightboxNavButtons() {
  const prev = document.getElementById('lightbox-prev');
  const next = document.getElementById('lightbox-next');
  const items = getActiveLightboxItems();

  const hasPrev = lightboxIndex > 0;
  const hasNext = lightboxIndex >= 0 && lightboxIndex < items.length - 1;
  prev.disabled = !hasPrev;
  next.disabled = !hasNext;
}

function applyLightboxTransform() {
  const lbImg = document.getElementById('lb-img');
  if (!lbImg) return;
  lbImg.style.transform = `translate3d(${lightboxTranslateX}px, ${lightboxTranslateY}px, 0) scale(${lightboxScale})`;
}

function resetLightboxTransform() {
  lightboxScale = 1;
  lightboxTranslateX = 0;
  lightboxTranslateY = 0;
  applyLightboxTransform();
}

function renderLightboxImage() {
  const lbImg = document.getElementById('lb-img');
  const items = getActiveLightboxItems();
  const current = items[lightboxIndex];
  if (!current) return;

  // В лайтбоксе всегда полный файл (премиальное качество). Режим safe=1 оставляет прежнюю экономию по памяти.
  const src = forceManualGalleryMode
    ? (current.thumbSrc || current.fullSrc)
    : (current.fullSrc || current.thumbSrc);
  lbImg.src = src;
  const altKey = lightboxAltSection || lightboxGalleryKey;
  if (altKey === 'auto' || altKey === 'people') {
    lbImg.alt = altForGallery(altKey, lightboxIndex + 1);
  } else {
    lbImg.alt = `Фото ${lightboxIndex + 1}`;
  }
  lbImg.setAttribute('aria-hidden', 'true');
  resetLightboxTransform();
  updateLightboxNavButtons();
}

function openLightboxAt(galleryKey, index, triggerEl) {
  const items = galleryEntries[galleryKey] || [];
  if (!items[index]) return;

  lastFocusedThumb = triggerEl || document.activeElement;
  lightboxSlidesOverride = null;
  lightboxAltSection = galleryKey;
  lightboxGalleryKey = galleryKey;
  lightboxIndex = index;

  const lb = document.getElementById('lightbox');
  lb.hidden = false;
  document.body.style.overflow = 'hidden';

  renderLightboxImage();
  document.getElementById('lightbox-close').focus();
  trackEvent('lightbox_open', galleryKey, { index: index + 1 });
}

function openLightboxSlides(slides, index, triggerEl, sectionForAlt) {
  if (!slides || !slides.length || index < 0 || index >= slides.length) return;

  lastFocusedThumb = triggerEl || document.activeElement;
  lightboxSlidesOverride = slides;
  lightboxAltSection = sectionForAlt || null;
  lightboxGalleryKey = null;
  lightboxIndex = index;

  const lb = document.getElementById('lightbox');
  lb.hidden = false;
  document.body.style.overflow = 'hidden';

  renderLightboxImage();
  document.getElementById('lightbox-close').focus();
  trackEvent('lightbox_open', 'series', { index: index + 1, total: slides.length });
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.hidden = true;
  const lbImg = document.getElementById('lb-img');
  lbImg.removeAttribute('src');
  lbImg.alt = '';
  resetLightboxTransform();
  lightboxSlidesOverride = null;
  lightboxAltSection = null;
  lightboxGalleryKey = null;
  lightboxIndex = -1;

  const seriesSheet = document.getElementById('series-sheet');
  document.body.style.overflow = seriesSheet && !seriesSheet.hidden ? 'hidden' : '';

  if (lastFocusedThumb && typeof lastFocusedThumb.focus === 'function') {
    lastFocusedThumb.focus();
  }
}

function touchDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function showPrevInLightbox() {
  if (lightboxIndex <= 0) return;
  lightboxIndex -= 1;
  renderLightboxImage();
}

function showNextInLightbox() {
  const items = getActiveLightboxItems();
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

function removeSeriesSheetJsonLd() {
  document.getElementById('dynamic-series-jsonld')?.remove();
}

function closeSeriesSheet() {
  const sheet = document.getElementById('series-sheet');
  if (!sheet || sheet.hidden) return;
  removeSeriesSheetJsonLd();
  const meta = document.getElementById('series-sheet-meta');
  if (meta) {
    meta.hidden = true;
    const t = document.getElementById('series-sheet-title');
    const d = document.getElementById('series-sheet-desc');
    if (t) {
      t.textContent = '';
      t.hidden = false;
    }
    if (d) {
      d.textContent = '';
      d.hidden = false;
    }
  }
  const grid = document.getElementById('series-sheet-grid');
  if (grid) {
    grid.querySelectorAll('.series-sheet-thumb').forEach((img) => {
      if (galleryLoadObserver) {
        try {
          galleryLoadObserver.unobserve(img);
        } catch (_) {
          /* ignore */
        }
      }
    });
    grid.innerHTML = '';
  }
  sheet.hidden = true;
  document.body.style.overflow = '';
  if (lastSeriesSheetOpener && typeof lastSeriesSheetOpener.focus === 'function') {
    lastSeriesSheetOpener.focus();
  }
  lastSeriesSheetOpener = null;
}

function openSeriesSheet(galleryKey, gridEntry, triggerEl) {
  if (!gridEntry || gridEntry.kind !== 'series' || !gridEntry.seriesExtras.length) return;

  const sheet = document.getElementById('series-sheet');
  const grid = document.getElementById('series-sheet-grid');
  if (!sheet || !grid) return;

  lastSeriesSheetOpener = triggerEl || document.activeElement;
  removeSeriesSheetJsonLd();
  grid.innerHTML = '';

  const metaEl = document.getElementById('series-sheet-meta');
  const titleEl = document.getElementById('series-sheet-title');
  const descEl = document.getElementById('series-sheet-desc');
  const seriesTitle = gridEntry.title || '';
  const seriesDesc = gridEntry.description || '';
  if (metaEl && titleEl && descEl) {
    titleEl.textContent = seriesTitle;
    descEl.textContent = seriesDesc;
    const hasMeta = Boolean(seriesTitle || seriesDesc);
    metaEl.hidden = !hasMeta;
    titleEl.hidden = !seriesTitle;
    descEl.hidden = !seriesDesc;
  }

  const absBase = new URL(window.location.href).origin;
  const imageUrls = gridEntry.slides.map((s) => `${absBase}/${normalizePath(s.fullSrc)}`);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: seriesTitle || `Серия — ${galleryKey === 'auto' ? 'авто' : 'люди'}`,
    description: seriesDesc || undefined,
    numberOfItems: gridEntry.slides.length,
    image: imageUrls
  };
  if (!seriesDesc) delete ld.description;
  const ldScript = document.createElement('script');
  ldScript.id = 'dynamic-series-jsonld';
  ldScript.type = 'application/ld+json';
  ldScript.textContent = JSON.stringify(ld);
  document.head.appendChild(ldScript);

  sheet.setAttribute(
    'aria-label',
    seriesTitle ? `Серия: ${seriesTitle}` : 'Снимки серии'
  );

  gridEntry.slides.forEach((slide, j) => {
    const cell = document.createElement('div');
    cell.className = 'series-sheet-cell';

    const img = document.createElement('img');
    img.className = 'series-sheet-thumb';
    img.alt = seriesTitle
      ? `${seriesTitle}, кадр ${j + 1}`
      : altForGallery(galleryKey, j + 1);
    img.decoding = 'async';
    img.loading = 'lazy';
    img.tabIndex = 0;
    img.dataset.fullSrc = slide.fullSrc;
    img.dataset.thumbSrc = slide.thumbSrc || slide.fullSrc;
    img.dataset.srcset = slide.srcset || '';
    img.dataset.sizes = slide.sizes || '';
    img.dataset.imageReady = '0';
    img.dataset.loadQueued = '0';
    img.dataset.usedFullFallback = '0';
    img.classList.remove('thumb-error');
    img.src = IMG_PLACEHOLDER;

    const openSlideLb = () => {
      if (img.dataset.imageReady !== '1') return;
      openLightboxSlides(gridEntry.slides, j, img, galleryKey);
    };

    img.addEventListener('click', openSlideLb);
    img.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openSlideLb();
    });

    cell.appendChild(img);
    grid.appendChild(cell);

    if (galleryLoadObserver) {
      galleryLoadObserver.observe(img);
    } else {
      requestGalleryImageLoad(img, entryFromDataset(img));
    }
  });

  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  trackEvent('series_sheet_open', galleryKey, { slides: gridEntry.slides.length });
  document.getElementById('series-sheet-back')?.focus();
}

function appendGalleryThumb(grid, galleryKey, entry, index) {
  const item = document.createElement('div');
  item.className = 'gallery-item';

  const img = document.createElement('img');
  img.className = 'gallery-thumb';
  img.alt = entry.title || altForGallery(galleryKey, index + 1);
  img.decoding = 'async';
  img.loading = 'lazy';
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
  img.classList.remove('thumb-error');
  img.src = IMG_PLACEHOLDER;

  if (entry.width && entry.height) {
    img.width = entry.width;
    img.height = entry.height;
  }

  const isSeries = entry.kind === 'series' && entry.seriesExtras.length > 0;

  const openFromThumb = () => {
    if (img.dataset.imageReady !== '1') return;
    if (isSeries) {
      openSeriesSheet(galleryKey, entry, img);
    } else {
      const idx = Number(img.dataset.galleryIndex);
      openLightboxAt(galleryKey, idx, img);
    }
  };

  img.addEventListener('click', openFromThumb);
  img.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openFromThumb();
  });

  item.appendChild(img);
  if (isSeries) {
    const badge = document.createElement('span');
    badge.className = 'gallery-count-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = String(entry.slides.length);
    item.appendChild(badge);
  }
  if (entry.title) {
    const cap = document.createElement('span');
    cap.className = 'gallery-caption';
    cap.textContent = entry.title;
    item.appendChild(cap);
  }
  grid.appendChild(item);

  if (galleryLoadObserver) {
    galleryLoadObserver.observe(img);
  } else {
    if (isVeryLowMemoryMode()) {
      return;
    }
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

function loadThumbBatchSynchronously(grid, startIndex, count) {
  const thumbs = Array.from(grid.querySelectorAll('.gallery-thumb'));
  const end = Math.min(startIndex + count, thumbs.length);
  for (let i = startIndex; i < end; i++) {
    const img = thumbs[i];
    if (!img || img.dataset.imageReady === '1' || img.dataset.imageReady === 'error') continue;
    requestGalleryImageLoad(img, entryFromDataset(img));
  }
  return Math.max(0, end - startIndex);
}

function bindLoadMore(galleryKey, containerId) {
  const btn = document.getElementById(`${galleryKey}-load-more`);
  if (!btn) return;
  btn.onclick = () => {
    const rendered = Number(btn.dataset.renderedCount || '0');
    const total = galleryEntries[galleryKey].length;
    const nextChunk = isVeryLowMemoryMode() ? 4 : (isLikelyIOSWebKit() ? 12 : 18);
    appendGalleryBatch(containerId, galleryKey, galleryEntries[galleryKey], rendered, nextChunk);
    const nextRendered = Math.min(rendered + nextChunk, total);
    if (isVeryLowMemoryMode()) {
      const grid = document.getElementById(containerId);
      if (grid) {
        loadThumbBatchSynchronously(grid, rendered, nextChunk);
      }
    }
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

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'gallery-empty';
    empty.textContent =
      'В этом разделе пока нет работ. Загляните позже — подборка обновляется.';
    empty.setAttribute('role', 'status');
    grid.appendChild(empty);
    galleryEntries[galleryKey] = [];
    const btn = document.getElementById(`${galleryKey}-load-more`);
    if (btn) {
      btn.hidden = true;
      btn.dataset.renderedCount = '0';
    }
    return;
  }

  galleryEntries[galleryKey] = entries;

  const mobileLimit = getMobileInitialLimit();
  const initialCount = mobileLimit == null ? entries.length : Math.min(entries.length, mobileLimit);
  appendGalleryBatch(containerId, galleryKey, entries, 0, initialCount);
  if (isVeryLowMemoryMode()) {
    const grid = document.getElementById(containerId);
    if (grid) {
      loadThumbBatchSynchronously(grid, 0, initialCount);
    }
  }

  const btn = document.getElementById(`${galleryKey}-load-more`);
  if (btn) {
    btn.dataset.renderedCount = String(initialCount);
  }
  bindLoadMore(galleryKey, containerId);
  updateLoadMoreVisibility(galleryKey, initialCount, entries.length);
}

async function runAutoGallery(forceReload = false, options = {}) {
  showSection('auto', options);
  if (galleryRendered.auto && !forceReload) return;

  try {
    const m = await loadGalleryManifest();
    const entries = normalizeManifestList(m?.auto);
    renderGalleryGrid('auto-grid', 'auto', entries);
    galleryRendered.auto = true;
  } catch {
    const fallback = normalizeManifestList([]);
    renderGalleryGrid('auto-grid', 'auto', fallback);
    galleryRendered.auto = true;
  }
}

async function runPeopleGallery(forceReload = false, options = {}) {
  showSection('people', options);
  if (galleryRendered.people && !forceReload) return;

  try {
    const m = await loadGalleryManifest();
    const entries = normalizeManifestList(m?.people);
    renderGalleryGrid('people-grid', 'people', entries);
    galleryRendered.people = true;
  } catch {
    const fallback = normalizeManifestList([]);
    renderGalleryGrid('people-grid', 'people', fallback);
    galleryRendered.people = true;
  }
}

async function routeByHash(source) {
  const sectionId = sectionFromHash(window.location.hash);
  const vtOpts = { skipTransition: source === 'init' };
  if (sectionId === 'auto') {
    await runAutoGallery(false, vtOpts);
  } else if (sectionId === 'people') {
    await runPeopleGallery(false, vtOpts);
  } else {
    showSection(sectionId, vtOpts);
  }
  trackEvent('section_view', sectionId, { source: source || 'unknown' });
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    if (!sessionStorage.getItem('pf_visit')) {
      sessionStorage.setItem('pf_visit', '1');
      fetch('/api/track', { method: 'POST', keepalive: true }).catch(() => {});
    }
  } catch (_) {
    /* ignore */
  }

  const startupLoader = document.getElementById('site-loader');
  document.body.classList.add('app-loading');

  const hideLoader = () => {
    if (!startupLoader) {
      document.body.classList.remove('app-loading');
      return;
    }
    if (startupLoader.classList.contains('is-hidden')) return;
    startupLoader.classList.add('is-hidden');
    document.body.classList.remove('app-loading');
  };

  forceManualGalleryMode = window.location.search.includes('safe=1');
  if (isVeryLowMemoryMode()) {
    document.body.classList.add('low-memory-mode');
  }
  maxConcurrentGalleryLoads = isVeryLowMemoryMode() ? 1 : (isMemoryConstrainedDevice() ? 2 : 8);
  galleryLoadObserver = createGalleryLoadObserver();
  galleryUnloadObserver = createGalleryUnloadObserver();

  document.querySelectorAll('.split-side [data-bg]').forEach((el) => {
    if (isVeryLowMemoryMode() && el.classList.contains('bg-color')) {
      return;
    }
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

  const mainHeader = document.querySelector('.main-header');
  const updateHeaderGlassState = () => {
    if (!mainHeader) return;
    const glassOn = window.scrollY > 56;
    mainHeader.classList.toggle('is-scrolled', glassOn);
  };
  updateHeaderGlassState();
  window.addEventListener('scroll', updateHeaderGlassState, { passive: true });

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

  const enableTapFx = (el) => {
    if (!el) return;
    el.classList.add('tap-pop');
    setTimeout(() => el.classList.remove('tap-pop'), 240);
  };

  document
    .querySelectorAll(
      '.nav-btn, .gallery-thumb, .series-sheet-thumb, .hero-cta, .gallery-load-more, .floating-cta'
    )
    .forEach((el) => {
      el.addEventListener('click', () => enableTapFx(el));
    });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { root: null, threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
    );
    document.querySelectorAll('.content-section article, .content-section .price-card, .content-section .faq-list details').forEach((el) => {
      el.classList.add('reveal-item');
      revealObserver.observe(el);
    });
  }

  const waitForInitialAssets = () => new Promise((resolve) => {
    const heroEls = Array.from(document.querySelectorAll('.split-side [data-bg]'));
    const urls = heroEls
      .map((el) => el.dataset.bg)
      .filter((src) => typeof src === 'string' && src.trim().length > 0);

    if (!urls.length) {
      resolve();
      return;
    }

    let settled = 0;
    const done = () => {
      settled += 1;
      if (settled >= urls.length) resolve();
    };

    urls.forEach((src) => {
      const i = new Image();
      i.onload = done;
      i.onerror = done;
      i.src = src;
    });
  });

  if (!window.location.hash) {
    window.history.replaceState(null, '', '#gallery');
  }
  const initialRoute = routeByHash('init');
  Promise.resolve(initialRoute)
    .then(() => waitForInitialAssets())
    .catch(() => {
      /* ignore */
    })
    .finally(() => {
      setTimeout(hideLoader, 180);
    });

  setTimeout(hideLoader, 5000);

  window.addEventListener('hashchange', () => {
    void routeByHash('hashchange');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener(
      'load',
      () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      },
      { once: true }
    );
  }

  let deferredInstallPrompt = null;
  const installBar = document.getElementById('install-banner');
  const installBtn = document.getElementById('install-btn');
  const installDismiss = document.getElementById('install-dismiss');
  if (installBar && installBtn && installDismiss && !isStandaloneDisplayMode()) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      installBar.hidden = false;
    });
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      installBar.hidden = true;
    });
    installDismiss.addEventListener('click', () => {
      installBar.hidden = true;
    });
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      try {
        await deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
      } catch {
        /* ignore */
      }
      deferredInstallPrompt = null;
      installBar.hidden = true;
    });
  }

  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbShield = document.getElementById('lightbox-shield');
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
  if (lbShield) {
    lbShield.addEventListener('click', (e) => e.stopPropagation());
  }

  const lightboxStage = document.getElementById('lightbox-stage');
  if (lightboxStage) {
    lightboxStage.addEventListener('touchstart', (e) => {
      if (lightbox.hidden) return;
      if (e.touches.length === 2) {
        lightboxPinchStartDistance = touchDistance(e.touches[0], e.touches[1]);
        lightboxPinchStartScale = lightboxScale;
        return;
      }
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastLightboxTapTime < 280) {
          e.preventDefault();
          if (lightboxScale > 1) {
            resetLightboxTransform();
          } else {
            lightboxScale = 2;
            applyLightboxTransform();
          }
          lastLightboxTapTime = 0;
          return;
        }
        lastLightboxTapTime = now;
        lightboxTouchStartX = e.touches[0].clientX;
        lightboxTouchStartY = e.touches[0].clientY;
        lightboxTouchStartTime = now;
        lightboxPanStartX = lightboxTranslateX;
        lightboxPanStartY = lightboxTranslateY;
      }
    }, { passive: false });

    lightboxStage.addEventListener('touchmove', (e) => {
      if (lightbox.hidden) return;
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = touchDistance(e.touches[0], e.touches[1]);
        if (!lightboxPinchStartDistance) return;
        const next = (dist / lightboxPinchStartDistance) * lightboxPinchStartScale;
        lightboxScale = Math.max(1, Math.min(3, next));
        if (lightboxScale === 1) {
          lightboxTranslateX = 0;
          lightboxTranslateY = 0;
        }
        applyLightboxTransform();
        return;
      }
      if (e.touches.length === 1 && lightboxScale > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - lightboxTouchStartX;
        const dy = e.touches[0].clientY - lightboxTouchStartY;
        lightboxTranslateX = lightboxPanStartX + dx;
        lightboxTranslateY = lightboxPanStartY + dy;
        applyLightboxTransform();
      }
    }, { passive: false });

    lightboxStage.addEventListener('touchend', (e) => {
      if (lightbox.hidden) return;
      if (e.touches.length === 0) {
        lightboxPinchStartDistance = 0;
        if (lightboxScale > 1) return;
        const dx = (e.changedTouches[0]?.clientX || 0) - lightboxTouchStartX;
        const dy = (e.changedTouches[0]?.clientY || 0) - lightboxTouchStartY;
        const dt = Date.now() - lightboxTouchStartTime;
        if (Math.abs(dx) > 44 && Math.abs(dy) < 36 && dt < 420) {
          if (dx < 0) showNextInLightbox();
          else showPrevInLightbox();
        }
      }
    });
  }

  document.addEventListener('contextmenu', (e) => {
    if (
      e.target.closest('.gallery-thumb') ||
      e.target.closest('.series-sheet-thumb') ||
      e.target.closest('#lightbox')
    ) {
      e.preventDefault();
    }
  });

  document.addEventListener('dragstart', (e) => {
    if (
      e.target.closest('.gallery-thumb') ||
      e.target.closest('.series-sheet-thumb') ||
      e.target.closest('#lightbox')
    ) {
      e.preventDefault();
    }
  });

  const seriesSheet = document.getElementById('series-sheet');
  const seriesBack = document.getElementById('series-sheet-back');
  if (seriesBack) {
    seriesBack.addEventListener('click', () => closeSeriesSheet());
  }
  if (seriesSheet) {
    seriesSheet.addEventListener('click', (e) => {
      if (e.target === seriesSheet) closeSeriesSheet();
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['s', 'S', 'u', 'U'].includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      if (!lightbox.hidden) {
        closeLightbox();
        return;
      }
      if (seriesSheet && !seriesSheet.hidden) {
        closeSeriesSheet();
        return;
      }
    }
    if (!lightbox.hidden) {
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
