const config = {
    autoCount: 49,
    peopleCount: 21
};

// ТВОИ ПРОЕКТЫ - МЕНЯЙ ЗДЕСЬ
const myProjects = [
    { folder: 'drift_msk', title: 'DRIFT MOSCOW 2026' },
    { folder: 'bmw_m5', title: 'BMW M5 F90 SMOKE' },
    { folder: 'wedding_june', title: 'ALEX & ANNA WEDDING' }
];

function showSection(id) {
    window.scrollTo(0, 0);
    // Скрываем всё
    document.querySelectorAll('.split-container, .full-screen-content').forEach(s => {
        s.classList.remove('active');
    });
    
    // Показываем нужное
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if(target) {
        target.classList.add('active');
    }

    if(id === 'projects') renderProjects();
}

function renderProjects() {
    const list = document.getElementById('projects-list');
    if(!list) return;
    list.innerHTML = '';

    myProjects.forEach(proj => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <img src="img/projects/${proj.folder}/1.webp" loading="lazy">
            <div class="project-info"><h3>${proj.title}</h3></div>
        `;
        card.onclick = () => openProject(proj.folder, proj.title);
        list.appendChild(card);
    });
}

function openProject(folder, title) {
    showSection('single-project');
    document.getElementById('project-title').innerText = title;
    const grid = document.getElementById('project-images-grid');
    grid.innerHTML = '';

    // Загружаем до 100 фото из папки проекта
    for(let i = 1; i <= 100; i++) {
        const src = `img/projects/${folder}/${i}.webp`;
        const img = new Image();
        img.src = src;
        img.onload = () => {
            const item = document.createElement('div');
            item.className = 'masonry-item';
            img.classList.add('loaded');
            item.appendChild(img);
            item.onclick = () => openLightbox(src);
            grid.appendChild(item);
        };
        img.onerror = () => {}; // Просто игнорируем отсутствие файлов
    }
}

function loadArchive(containerId, folder, count) {
    const grid = document.getElementById(containerId);
    if(!grid) return;
    grid.innerHTML = '';
    
    for(let i = count; i >= 1; i--) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        const img = new Image();
        img.src = `img/${folder}/${i}.webp`;
        img.onload = () => {
            img.classList.add('loaded');
            item.appendChild(img);
            item.onclick = () => openLightbox(img.src);
            grid.appendChild(item);
        };
    }
}

function showAuto() { 
    showSection('auto-feed'); 
    loadArchive('auto-masonry', 'auto', config.autoCount); 
}

function showPeople() { 
    showSection('people-feed'); 
    loadArchive('people-masonry', 'people', config.peopleCount); 
}

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    lb.style.display = 'flex';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}

// При запуске показываем главную
document.addEventListener('DOMContentLoaded', () => {
    showSection('main');
});