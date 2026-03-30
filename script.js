const config = { autoCount: 49, peopleCount: 21 };

// Если не хочешь писать в коде, просто добавь названия папок сюда. 
// Это единственный способ, чтобы JS знал, что искать.
const projectFolders = ['drift_day', 'night_city', 'wedding_test']; 

function showSection(id) {
    window.scrollTo(0, 0);
    document.querySelectorAll('.split-container, .full-screen-content').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if(target) target.classList.add('active');
    if(id === 'projects') renderProjects();
}

function renderProjects() {
    const list = document.getElementById('projects-list');
    if(!list) return;
    list.innerHTML = '';

    projectFolders.forEach(folder => {
        const card = document.createElement('div');
        card.className = 'project-card';
        const title = folder.replace(/_/g, ' ').toUpperCase();
        
        card.innerHTML = `
            <img src="img/projects/${folder}/1.webp" onerror="this.src='img/projects/${folder}/1.jpg'">
            <div class="project-info"><h3>${title}</h3></div>
        `;
        card.onclick = () => openProject(folder, title);
        list.appendChild(card);
    });
}

function openProject(folder, title) {
    showSection('single-project');
    document.getElementById('project-title').innerText = title;
    const grid = document.getElementById('project-images-grid');
    grid.innerHTML = '';
    
    // Пробуем загрузить 100 фото. Если фото нет - оно просто не добавится.
    for(let i = 1; i <= 100; i++) {
        const formats = ['webp', 'jpg', 'png'];
        formats.forEach(ext => {
            const img = new Image();
            img.src = `img/projects/${folder}/${i}.${ext}`;
            img.onload = () => {
                const item = document.createElement('div');
                item.className = 'masonry-item';
                img.classList.add('loaded');
                item.appendChild(img);
                item.onclick = () => openLightbox(img.src);
                grid.appendChild(item);
            };
        });
    }
}

function loadArchive(containerId, folder, count) {
    const grid = document.getElementById(containerId);
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
        grid.appendChild(item);
    }
}

function showAuto() { showSection('auto-feed'); loadArchive('auto-masonry', 'auto', config.autoCount); }
function showPeople() { showSection('people-feed'); loadArchive('people-masonry', 'people', config.peopleCount); }

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    lb.style.display = 'flex';
}
function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }
document.addEventListener('DOMContentLoaded', () => showSection('main'));