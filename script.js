const config = {
    autoCount: 49,
    peopleCount: 16
};

// Список папок галереи
const galleries = [
    { id: 'drift', title: 'DRIFT DAY 2026', cover: '1.jpg' }
];

function showSection(id) {
    const sections = document.querySelectorAll('.split-container, .full-screen-content');
    sections.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if(target) {
        target.style.display = 'flex';
        requestAnimationFrame(() => target.classList.add('active'));
    }
}

// Умная загрузка фото
function loadImages(containerId, folder, count, shuffle = false) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    let paths = [];
    for(let i = 1; i <= count; i++) paths.push(`img/${folder}/${i}.jpg`);
    
    if(shuffle) paths.sort(() => Math.random() - 0.5);

    paths.forEach((src) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        
        const img = new Image();
        img.dataset.src = src; // Используем data-src для Lazy Load
        img.className = 'lazy-img';
        
        item.appendChild(img);
        item.onclick = () => openLightbox(src);
        grid.appendChild(item);
        
        // Наблюдатель: грузим только когда фото в зоне видимости
        observer.observe(img);
    });
}

// Intersection Observer для ленивой загрузки
const observer = new IntersectionObserver((entries, self) => {
    entries.forEach(entry => {
        if(entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.onload = () => img.classList.add('loaded');
            self.unobserve(img);
        }
    });
}, { rootMargin: '200px' });

async function openSubGallery(folderId, title) {
    showSection('sub-gallery');
    document.getElementById('sub-gallery-title').innerText = title;
    const grid = document.getElementById('sub-gallery-masonry');
    grid.innerHTML = '';
    
    // Прямой перебор для папок (макс 100)
    for(let i = 1; i <= 100; i++) {
        const src = `img/gallery/${folderId}/${i}.jpg`;
        const exists = await new Promise(r => {
            const img = new Image(); img.src = src;
            img.onload = () => r(true); img.onerror = () => r(false);
        });
        if(exists) {
            const item = document.createElement('div');
            item.className = 'masonry-item';
            const img = document.createElement('img');
            img.src = src;
            img.onload = () => img.classList.add('loaded');
            item.appendChild(img);
            item.onclick = () => openLightbox(src);
            grid.appendChild(item);
        } else break;
    }
}

function renderGalleryList() {
    const list = document.getElementById('gallery-list');
    if(!list) return;
    list.innerHTML = '';
    galleries.forEach(g => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `<img src="img/gallery/${g.id}/${g.cover}"><h3>${g.title}</h3>`;
        card.onclick = () => openSubGallery(g.id, g.title);
        list.appendChild(card);
    });
}

function showAuto() { showSection('auto-feed'); loadImages('auto-masonry', 'auto', config.autoCount, true); }
function showPeople() { showSection('people-feed'); loadImages('people-masonry', 'people', config.peopleCount, true); }

// Обработка навигации
document.addEventListener('click', (e) => {
    const link = e.target.closest('nav a');
    if(!link) return;
    
    if(link.textContent.includes('ГАЛЕРЕЯ')) {
        e.preventDefault();
        showSection('gallery');
        renderGalleryList();
    } else if(link.textContent.includes('ОБО МНЕ')) {
        e.preventDefault();
        showSection('about');
    } else if(link.textContent.includes('СВЯЗЬ')) {
        e.preventDefault();
        showSection('contact');
    }
});

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    lb.style.display = 'flex';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => showSection('main'));