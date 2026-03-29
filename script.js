// НАСТРОЙКА ГАЛЕРЕИ: Добавляй новые папки сюда
const galleries = [
    { id: 'automotive-2026', title: 'Street Culture 2026', cover: '1.jpg' },
    // { id: 'folder-name', title: 'Visible Title', cover: '1.jpg' }
];

function showSection(sectionId) {
    const sections = document.querySelectorAll('.split-container, .full-screen-content');
    sections.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    if(target) {
        target.style.display = 'flex';
        target.scrollTop = 0; 
        requestAnimationFrame(() => target.classList.add('active'));
    }
    if(sectionId === 'gallery') renderGalleryList();
}

function renderGalleryList() {
    const list = document.getElementById('gallery-list');
    list.innerHTML = '';
    galleries.forEach(g => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
            <img src="img/gallery/${g.id}/${g.cover}" alt="${g.title}">
            <div class="gallery-info"><h3>${g.title}</h3></div>
        `;
        card.onclick = () => openSubGallery(g.id, g.title);
        list.appendChild(card);
    });
}

async function openSubGallery(folderId, title) {
    showSection('sub-gallery');
    document.getElementById('sub-gallery-title').innerText = title;
    const grid = document.getElementById('sub-gallery-masonry');
    grid.innerHTML = ''; 
    loadImagesToGrid(grid, `gallery/${folderId}`);
}

async function loadImagesToGrid(grid, path, shuffle = false) {
    let tempArray = [];
    for (let i = 1; i <= 100; i++) {
        const src = `img/${path}/${i}.jpg`;
        const exists = await new Promise(r => {
            const img = new Image(); img.src = src;
            img.onload = () => r(true); img.onerror = () => r(false);
        });
        if (exists) tempArray.push(src); else break;
    }
    if (shuffle) {
        for (let i = tempArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tempArray[i], tempArray[j]] = [tempArray[j], tempArray[i]];
        }
    }
    tempArray.forEach((src, idx) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        const img = document.createElement('img');
        img.src = src;
        img.onload = () => setTimeout(() => img.classList.add('loaded'), idx * 40);
        item.appendChild(img);
        item.onclick = () => openLightbox(src);
        grid.appendChild(item);
    });
}

function showAuto() { showSection('auto-feed'); loadImagesToGrid(document.getElementById('auto-masonry'), 'auto', true); }
function showPeople() { showSection('people-feed'); loadImagesToGrid(document.getElementById('people-masonry'), 'people', true); }

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    lb.style.display = 'flex';
}
function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => showSection('main'));