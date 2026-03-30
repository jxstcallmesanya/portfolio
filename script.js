const config = {
    autoCount: 49,
    peopleCount: 21
};

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

    if (id === 'gallery') renderGalleryList();
}

function loadArchive(containerId, folder, count) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    
    const items = [];
    for(let i = count; i >= 1; i--) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        grid.appendChild(item);
        items.push({ num: i, element: item });
    }

    items.forEach(obj => {
        const src = `img/${folder}/${obj.num}.webp`;
        const img = new Image();
        img.loading = "lazy";
        
        img.onload = () => {
            img.classList.add('loaded');
            obj.element.appendChild(img);
            obj.element.onclick = () => openLightbox(src);
        };
        
        img.onerror = () => obj.element.remove();
        
        // ВАЖНО: Присваиваем src ПОСЛЕ onload, чтобы картинки грузились без ошибок кэша
        img.src = src; 
    });
}

function renderGalleryList() {
    const list = document.getElementById('gallery-list');
    if(!list) return;
    list.innerHTML = '';
    galleries.forEach(g => {
        const div = document.createElement('div');
        div.className = 'gallery-card';
        div.innerHTML = `<img src="img/gallery/${g.id}/${g.cover}" loading="lazy"><div class="gallery-info"><h3>${g.title}</h3></div>`;
        div.onclick = () => openSubGallery(g.id, g.title);
        list.appendChild(div);
    });
}

async function openSubGallery(folderId, title) {
    showSection('sub-gallery');
    document.getElementById('sub-gallery-title').innerText = title;
    const grid = document.getElementById('sub-gallery-masonry');
    grid.innerHTML = '';
    
    for(let i = 1; i <= 60; i++) {
        const src = `img/gallery/${folderId}/${i}.webp`;
        const item = document.createElement('div');
        item.className = 'masonry-item';
        
        const img = new Image();
        img.loading = "lazy";
        
        img.onload = () => {
            img.classList.add('loaded');
            item.appendChild(img);
            item.onclick = () => openLightbox(src);
            grid.appendChild(item);
        };
        img.onerror = () => item.remove();
        
        img.src = src;
    }
}

function showAuto() { showSection('auto-feed'); loadArchive('auto-masonry', 'auto', config.autoCount); }
function showPeople() { showSection('people-feed'); loadArchive('people-masonry', 'people', config.peopleCount); }

document.addEventListener('click', (e) => {
    const link