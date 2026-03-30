const config = {
    autoCount: 49, 
    peopleCount: 21 
};

const myProjects = [
    { folder: 'drift_day', title: 'DRIFT DAY 2026' },
    { folder: 'night_city', title: 'NIGHT SESSION' }
];

function showSection(id) {
    window.scrollTo(0, 0);
    // Закрываем все секции
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none'; // Полностью скрываем для производительности
    });
    
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if(target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }
    
    if(id === 'projects') renderProjects();
}

// Умная загрузка сетки (Архивы)
function loadGrid(containerId, folder, count) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for(let i = count; i >= 1; i--) {
        const img = document.createElement('img');
        img.style.opacity = "0";
        img.src = `img/${folder}/${i}.webp`;
        img.loading = "lazy";
        
        img.onload = () => {
            img.style.opacity = "1";
        };
        
        img.onclick = () => openLightbox(img.src);
        fragment.appendChild(img);
    }
    grid.appendChild(fragment);
}

function showAuto() { showSection('auto'); loadGrid('auto-grid', 'auto', config.autoCount); }
function showPeople() { showSection('people'); loadGrid('people-grid', 'people', config.peopleCount); }

// Список проектов
function renderProjects() {
    const list = document.getElementById('projects-list');
    if(!list) return;
    list.innerHTML = '';
    myProjects.forEach(p => {
        const div = document.createElement('div');
        div.className = 'project-item';
        div.innerHTML = `<img src="img/projects/${p.folder}/1.webp" loading="lazy"><h3>${p.title}</h3>`;
        div.onclick = () => openProject(p.folder, p.title);
        list.appendChild(div);
    });
}

// Загрузка внутри проекта (с проверкой наличия)
function openProject(folder, title) {
    showSection('single-project');
    document.getElementById('project-title').innerText = title;
    const grid = document.getElementById('project-photos');
    grid.innerHTML = '';
    
    // Лимит 60 фото для производительности мобилок
    for(let i = 60; i >= 1; i--) {
        const img = new Image();
        img.src = `img/projects/${folder}/${i}.webp`;
        
        img.onload = () => {
            const galleryImg = document.createElement('img');
            galleryImg.src = img.src;
            galleryImg.onclick = () => openLightbox(galleryImg.src);
            grid.appendChild(galleryImg);
        };
    }
}

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lb-img').src = src;
    lb.style.display = 'flex';
}

// Закрытие лайтбокса при клике на фон
document.getElementById('lightbox').addEventListener('click', function(e) {
    if(e.target !== document.getElementById('lb-img')) {
        this.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => showSection('main'));