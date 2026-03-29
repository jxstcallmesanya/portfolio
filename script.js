const config = {
    autoCount: 49,
    peopleCount: 16
};

// Сюда добавляем папки проектов
const galleries = [
    { id: 'drift', title: 'DRIFT DAY 2026', cover: '1.jpg' }
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
}

// Загрузка фото в архивы (Авто / Люди)
function loadArchive(containerId, folder, count) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    
    // Генерируем массив и перемешиваем
    let items = [];
    for(let i = 1; i <= count; i++) {
        items.push(`img/${folder}/${i}.jpg`);
    }
    items.sort(() => Math.random() - 0.5);

    items.forEach((src) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        const img = new Image();
        img.src = src;
        img.loading = "lazy";
        img.onload = () => img.classList.add('loaded');
        img.onerror = () => item.remove(); // Удаляем блок, если фото не найдено
        
        item.appendChild(img);
        item.onclick = () => openLightbox(src);
        grid.appendChild(item);
    });
}

// Загрузка конкретной галереи
async function openSubGallery(folderId, title) {
    showSection('sub-gallery');
    document.getElementById('sub-gallery-title').innerText = title;
    const grid = document.getElementById('sub-gallery-masonry');
    grid.innerHTML = '';
    
    // Пробуем загрузить первые 50 фото в папке проекта
    for(let i = 1; i <= 50; i++) {
        const src = `img/gallery/${folderId}/${i}.jpg`;
        const item = document.createElement('div');
        item.className = 'masonry-item';
        const img = new Image();
        img.src = src;
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
        div.innerHTML = `<img src="img/gallery/${g.id}/${g.cover}"><div class="gallery-info"><h3>${g.title}</h3></div>`;
        div.onclick = () => openSubGallery(g.id, g.title);
        list.appendChild(div);
    });
}

// Функции кнопок
function showAuto() { showSection('auto-feed'); loadArchive('auto-masonry', 'auto', config.autoCount); }
function showPeople() { showSection('people-feed'); loadArchive('people-masonry', 'people', config.peopleCount); }

// Навигация (делегирование)
document.addEventListener('click', (e) => {
    const link = e.target.closest('nav a');
    if(!link) return;
    const text = link.textContent.toUpperCase();
    
    if(text.includes('ГАЛЕРЕЯ')) {
        e.preventDefault();
        showSection('gallery');
        renderGalleryList();
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