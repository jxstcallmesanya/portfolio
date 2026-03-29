// Настройка количества фото в папках
const config = {
    autoCount: 20,    // Кол-во фото в img/auto/ (1.jpg, 2.jpg...)
    peopleCount: 15   // Кол-во фото в img/people/
};

// Список конкретных сетов для раздела "Галерея"
const projects = [
    /* Пример:
    { id: 'bmw-shoot', title: 'BMW M5 F90', cover: 'img/gallery/bmw/cover.jpg', folder: 'img/gallery/bmw/', count: 5 }
    */
];

function showSection(sectionId) {
    const sections = document.querySelectorAll('.split-container, .full-screen-content');
    sections.forEach(s => {
        s.classList.remove('active');
        setTimeout(() => { if(!s.classList.contains('active')) s.style.display = 'none'; }, 600);
    });

    const target = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    if(target) {
        target.style.display = 'flex';
        target.scrollTop = 0; // Сброс скролла вверх
        setTimeout(() => target.classList.add('active'), 50);
    }
    if(sectionId === 'gallery') renderProjects();
}

function showAuto() {
    showSection('auto-feed');
    const grid = document.getElementById('auto-masonry');
    grid.innerHTML = '';
    for(let i = 1; i <= config.autoCount; i++) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        item.innerHTML = `<img src="img/auto/${i}.jpg" loading="lazy">`;
        item.onclick = () => openLightbox(`img/auto/${i}.jpg`);
        grid.appendChild(item);
    }
}

function showPeople() {
    showSection('people-feed');
    const grid = document.getElementById('people-masonry');
    grid.innerHTML = '';
    for(let i = 1; i <= config.peopleCount; i++) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        item.innerHTML = `<img src="img/people/${i}.jpg" loading="lazy">`;
        item.onclick = () => openLightbox(`img/people/${i}.jpg`);
        grid.appendChild(item);
    }
}

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    lb.style.display = 'flex';
    setTimeout(() => lb.classList.add('active'), 10);
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    lb.classList.remove('active');
    setTimeout(() => lb.style.display = 'none', 400);
}

function renderProjects() {
    const list = document.getElementById('projects-list');
    list.innerHTML = projects.length ? '' : '<p style="opacity:0.2;">Здесь скоро появятся новые истории...</p>';
    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `<img src="${p.cover}"><div style="margin-top:10px; font-size:10px; opacity:0.5;">${p.title}</div>`;
        card.onclick = () => openProject(p);
        list.appendChild(card);
    });
}

function openProject(p) {
    showSection('project-inner');
    document.getElementById('project-title').innerText = p.title;
    const container = document.getElementById('project-photos');
    container.innerHTML = '';
    for(let i = 1; i <= p.count; i++) {
        const img = document.createElement('img');
        img.src = `${p.folder}${i}.jpg`;
        img.style.width = '100%';
        img.style.marginBottom = '20px';
        container.appendChild(img);
    }
}

document.addEventListener('DOMContentLoaded', () => showSection('main'));