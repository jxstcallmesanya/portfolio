const config = {
    autoCount: 49,
    peopleCount: 15
};

let lastFocusedThumb = null;

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

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

function loadGrid(containerId, folder, maxCount) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    grid.innerHTML = '';

    for (let i = 1; i <= maxCount; i++) {
        const img = document.createElement('img');
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        img.src = `img/${folder}/${i}.webp`;
        img.alt = altForGallery(folder, i);

        img.onerror = function() {
            this.remove();
        };

        img.addEventListener('click', function() {
            lastFocusedThumb = this;
            openLightbox(this.src, this.alt);
        });

        grid.appendChild(img);
    }
}

function showAuto() {
    showSection('auto');
    loadGrid('auto-grid', 'auto', config.autoCount);
}

function showPeople() {
    showSection('people');
    loadGrid('people-grid', 'people', config.peopleCount);
}

document.addEventListener('DOMContentLoaded', () => {
    showSection('main');

    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lb-img');
    const closeBtn = document.getElementById('lightbox-close');

    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeLightbox();
    });

    lbImg.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !lightbox.hidden) {
            closeLightbox();
        }
    });
});
