document.addEventListener('DOMContentLoaded', () => {
    /* ─── LOADER ─── */
    const loader = document.getElementById('site-loader');
    const hideLoader = () => {
        if (!loader || loader.classList.contains('is-hidden')) return;
        loader.classList.add('is-hidden');
    };
    window.addEventListener('load', () => setTimeout(hideLoader, 400), { once: true });
    setTimeout(hideLoader, 3500);

    /* ─── YEAR ─── */
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* ─── HEADER SCROLL ─── */
    const header = document.getElementById('main-header');
    const updateHeader = () => {
        if (!header) return;
        header.classList.toggle('is-scrolled', window.scrollY > 40);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

    /* ─── MOBILE MENU ─── */
    const burger = document.getElementById('burger');
    const mobileNav = document.getElementById('mobile-nav');
    if (burger && mobileNav) {
        burger.addEventListener('click', () => {
            const isOpen = !mobileNav.hidden;
            mobileNav.hidden = isOpen;
            burger.classList.toggle('is-open', !isOpen);
            burger.setAttribute('aria-expanded', String(!isOpen));
            document.body.style.overflow = isOpen ? '' : 'hidden';
        });
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.hidden = true;
                burger.classList.remove('is-open');
                burger.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
    }

    /* ─── SMOOTH SCROLL (anchors) ─── */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href');
            if (!id || id === '#') return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 80;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
            history.pushState(null, '', id);
        });
    });

    /* ─── FLEET FILTER ─── */
    const filterBtns = document.querySelectorAll('.filter-btn');
    const yachtCards = document.querySelectorAll('.yacht-card');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.filter;
            yachtCards.forEach(card => {
                if (cat === 'all' || card.dataset.category === cat) {
                    card.classList.remove('is-hidden');
                } else {
                    card.classList.add('is-hidden');
                }
            });
        });
    });

    /* ─── SCROLL REVEAL ─── */
    if ('IntersectionObserver' in window) {
        const revealObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObs.unobserve(entry.target);
                }
            });
        }, { root: null, threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.anim-reveal').forEach(el => revealObs.observe(el));
    } else {
        document.querySelectorAll('.anim-reveal').forEach(el => el.classList.add('is-visible'));
    }

    /* ─── COUNTER ANIMATION ─── */
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length && 'IntersectionObserver' in window) {
        const counterObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = parseInt(el.dataset.count, 10);
                if (isNaN(target)) return;
                counterObs.unobserve(el);
                animateCounter(el, target);
            });
        }, { threshold: 0.3 });
        counters.forEach(c => counterObs.observe(c));
    }

    function animateCounter(el, target) {
        const duration = 2000;
        const start = performance.now();
        const step = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /* ─── TESTIMONIALS SLIDER ─── */
    const track = document.getElementById('testimonial-track');
    const dotsContainer = document.getElementById('slider-dots');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');

    if (track && dotsContainer && prevBtn && nextBtn) {
        const cards = track.querySelectorAll('.testimonial-card');
        let current = 0;
        const total = cards.length;

        for (let i = 0; i < total; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `Отзыв ${i + 1}`);
            dot.addEventListener('click', () => goTo(i));
            dotsContainer.appendChild(dot);
        }

        function goTo(index) {
            current = Math.max(0, Math.min(index, total - 1));
            track.style.transform = `translateX(-${current * 100}%)`;
            dotsContainer.querySelectorAll('.slider-dot').forEach((d, i) => {
                d.classList.toggle('active', i === current);
            });
        }

        prevBtn.addEventListener('click', () => goTo(current - 1));
        nextBtn.addEventListener('click', () => goTo(current + 1));

        let autoSlide = setInterval(() => goTo((current + 1) % total), 6000);
        const slider = document.getElementById('testimonials-slider');
        if (slider) {
            slider.addEventListener('mouseenter', () => clearInterval(autoSlide));
            slider.addEventListener('mouseleave', () => {
                autoSlide = setInterval(() => goTo((current + 1) % total), 6000);
            });
        }

        let touchStartX = 0;
        track.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        track.addEventListener('touchend', (e) => {
            const dx = (e.changedTouches[0]?.clientX || 0) - touchStartX;
            if (Math.abs(dx) > 50) {
                if (dx < 0) goTo(current + 1);
                else goTo(current - 1);
            }
        });
    }

    /* ─── CONTACT FORM ─── */
    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const wrap = form.closest('.contact-form-wrap');
            if (wrap) {
                wrap.innerHTML = `
                    <div class="form-success">
                        <h3>Заявка отправлена</h3>
                        <p>Наш эксперт свяжется с вами в ближайшее время для персональной консультации.</p>
                    </div>
                `;
            }
        });
    }

    /* ─── PARALLAX EFFECT (subtle) ─── */
    const parallaxSection = document.querySelector('.parallax-divider');
    if (parallaxSection && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.addEventListener('scroll', () => {
            const rect = parallaxSection.getBoundingClientRect();
            const inView = rect.top < window.innerHeight && rect.bottom > 0;
            if (!inView) return;
            const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
            const overlay = parallaxSection.querySelector('.parallax-overlay');
            if (overlay) {
                overlay.style.transform = `translateY(${(progress - 0.5) * 30}px)`;
            }
        }, { passive: true });
    }
});
