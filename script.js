const config = {
    autoCount: 49,
    peopleCount: 21
};

// Твои спец-проекты (папки в img/gallery/)
// Cover теперь тоже в .webp
const galleries = [
    { id: 'drift', title: 'DRIFT DAY 2026', cover: '1.webp' }
];

function showSection(id) {
    window.scrollTo(0, 0);
    document.querySelectorAll('.split-container, .full-screen-content').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if(target) {
        target.style.display = 'flex';
        requestAnimationFrame(() => target.classList.add('active'));
    }

    if (id === 'gallery') {
        renderGalleryList();
    }
}

// ЗАГРУЗКА В ОБРАТНОМ ПОРЯДКЕ (49.webp -> 1.webp, 21.webp -> 1.webp)
function loadArchive(containerId, folder, count) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    
    // Цикл идет от максимума к 1 (хронологический порядок)
    for(let i = count; i >= 1; i--) {
        const src = `img/${folder}/${i}.webp`; // ФОРМАТ WEBP
        const item = document.createElement('div');
        item.className = 'masonry-item';
        
        const img = new Image();
        img.src = src;
        img.loading = "lazy"; // Native Lazy Loading
        
        img.onload = () => {
            img.classList.add('loaded');
            item.appendChild(img);
            item.onclick = () => openLightbox(src);
            grid.appendChild(item);
        };
        
        // Если какого-то номера нет, просто пропускаем
        img.onerror = () => item.remove();
    }
}

async function openSubGallery(folderId, title) {
    showSection('sub-gallery');
    document.getElementById('sub-gallery-title').innerText = title;
    const grid = document.getElementById('sub-gallery-masonry');
    grid.innerHTML = '';
    
    // В спец-галереях порядок прямой (1, 2, 3...)
    for(let i = 1; i <= 60; i++) {
        const src = `img/gallery/${folderId}/${i}.webp`; // ФОРМАТ WEBP
        const item = document.createElement('div');
        item.className = 'masonry-item';
        const img = new Image();
        img.src = src;
        img.loading = "lazy";
        img.onload = () => {
            img.classList.add('loaded');
            item.appendChild(img);
            item.onclick = () => openLightbox(src);
            grid.appendChild(item);
        };
        img.onerror = () => item.remove();
    }
}

function renderGalleryList() {
    const list = document.getElementById('gallery-list');
    if(!list) return;
    list.innerHTML = '';
    galleries.forEach(g => {
        const div = document.createElement('div');
        div.className = 'gallery-card';
        // Путь к обложке проекта
        div.innerHTML = `<img src="img/gallery/${g.id}/${g.cover}" loading="lazy"><div class="gallery-info"><h3>${g.title}</h3></div>`;
        div.onclick = () => openSubGallery(g.id, g.title);
        list.appendChild(div);
    });
}

function showAuto() { showSection('auto-feed'); loadArchive('auto-masonry', 'auto', config.autoCount); }
function showPeople() { showSection('people-feed'); loadArchive('people-masonry', 'people', config.peopleCount); }

document.addEventListener('click', (e) => {
    const link = e.target.closest('nav a');
    if(!link) return;
    const text = link.textContent.toUpperCase();
    
    if(text.includes('ГАЛЕРЕЯ')) {
        e.preventDefault();
        showSection('gallery');
    } else if(text.includes('ОБО МНЕ')) {
        e.preventDefault();
        showSection('about');
    } else if(text.includes('СВЯЗЬ')) {
        e.preventDefault();
        showSection('contact');
    }
});

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    lb.style.display = 'flex';
}
function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => showSection('main'));