const config = {
    autoCount: 49, 
    peopleCount: 21 
};

// ТВОИ ПРОЕКТЫ
const myProjects = [
    { folder: 'drift_day', title: 'DRIFT DAY 2026' },
    { folder: 'night_city', title: 'NIGHT SESSION' }
];

function showSection(id) {
    window.scrollTo(0, 0);
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if(target) target.classList.add('active');
    
    if(id === 'projects') renderProjects();
}

// Загрузка архивов (ОБРАТНЫЙ ПОРЯДОК: от Max до 1)
function loadGrid(containerId, folder, count) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    
    // Цикл идет вниз: начинаем с count, пока i >= 1, уменьшаем i
    for(let i = count; i >= 1; i--) {
        const img = document.createElement('img');
        img.src = `img/${folder}/${i}.webp`;
        img.loading = "lazy";
        img.onclick = () => openLightbox(img.src);
        grid.appendChild(img);
    }
}

function showAuto() { showSection('auto'); loadGrid('auto-grid', 'auto', config.autoCount); }
function showPeople() { showSection('people'); loadGrid('people-grid', 'people', config.peopleCount); }

// Список проектов
function renderProjects() {
    const list = document.getElementById('projects-list');
    list.innerHTML = '';
    myProjects.forEach(p => {
        const div = document.createElement('div');
        div.className = 'project-item';
        div.innerHTML = `<img src="img/projects/${p.folder}/1.webp"><h3>${p.title}</h3>`;
        div.onclick = () => openProject(p.folder, p.title);
        list.appendChild(div);
    });
}

// Просмотр проекта (ОБРАТНЫЙ ПОРЯДОК: от 50 до 1)
function openProject(folder, title) {
    showSection('single-project');
    document.getElementById('project-title').innerText = title;
    const grid = document.getElementById('project-photos');
    grid.innerHTML = '';
    
    // Проверяем фото от 50-го до 1-го
    for(let i = 50; i >= 1; i--) {
        const img = new Image();
        img.src = `img/projects/${folder}/${i}.webp`;
        img.onload = () => {
            img.onclick = () => openLightbox(img.src);
            // Добавляем в конец сетки, но так как мы идем от 50 до 1, 
            // первыми загрузятся и встанут те, что с большим номером
            grid.appendChild(img);
        };
        img.onerror = () => {}; 
    }
}

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lb-img').src = src;
    lb.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => showSection('main'));