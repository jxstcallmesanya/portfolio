(function () {
  async function applyTextOverrides(pageKey) {
    try {
      const res = await fetch('/site-text-overrides.json', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const pageData = data && typeof data === 'object' ? data[pageKey] : null;
      if (!pageData || typeof pageData !== 'object') return;
      Object.entries(pageData).forEach(([selector, text]) => {
        if (typeof selector !== 'string' || typeof text !== 'string' || !selector.trim()) return;
        const el = document.querySelector(selector);
        if (!el) return;
        el.textContent = text;
      });
    } catch {
      /* keep default text */
    }
  }

  window.applyTextOverrides = applyTextOverrides;
})();
