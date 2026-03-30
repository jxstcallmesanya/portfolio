const config = {
    autoCount: 49, 
    peopleCount: 21 
};

// Твои проекты
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

// Загрузка архивов (От новых к старым)
function loadGrid(containerId, folder, count) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    for(let i = count; i >= 1; i--) {
        const img = document.createElement('img');
        img.src = `img/${folder}/${i}.webp`;
        img.onclick = () => openLightbox(img.src);
        grid.appendChild(img);
    }
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
        div.innerHTML = `<img src="img/projects/${p.folder}/1.webp"><h3>${p.title}</h3>`;
        div.onclick = () => openProject(p.folder, p.title);
        list.appendChild(div);
    });
}

// Внутри проекта (От 50 вниз)
function openProject(folder, title) {
    showSection('single-project');
    document.getElementById('project-title').innerText = title;
    const grid = document.getElementById('project-photos');
    grid.innerHTML = '';
    for(let i = 50; i >= 1; i--) {
        const img = new Image();
        img.src = `img/projects/${folder}/${i}.webp`;
        img.onload = () => {
            img.onclick = () => openLightbox(img.src);
            grid.appendChild(img);
        };
    }
}

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lb-img').src = src;
    lb.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => showSection('main'));