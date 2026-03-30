const config = { autoCount: 49, peopleCount: 21 };

function showSection(id) {
    window.scrollTo(0, 0);
    document.querySelectorAll('.split-container, .full-screen-content').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if(target) target.classList.add('active');
    if(id === 'projects') autoDiscoverProjects();
}

// УМНЫЙ ПОИСК ПРОЕКТОВ БЕЗ PHP
async function autoDiscoverProjects() {
    const list = document.getElementById('projects-list');
    if(!list) return;
    list.innerHTML = '';

    // Скрипт проверяет папки 1, 2, 3... пока они не закончатся
    for (let i = 1; i <= 20; i++) {
        const folder = i.toString();
        const testImg = `img/projects/${folder}/1.webp`;
        
        try {
            const response = await fetch(testImg, { method: 'HEAD' });
            if (response.ok) {
                // Если папка есть, создаем карточку. 
                // Название проекта берем из скрытого файла или просто пишем PROJECT I
                const card = document.createElement('div');
                card.className = 'project-card';
                card.innerHTML = `
                    <img src="${testImg}" loading="lazy">
                    <div class="project-info"><h3>PROJECT ${i}</h3></div>
                `;
                card.onclick = () => openProject(folder, `PROJECT ${i}`);
                list.appendChild(card);
            } else {
                break; // Если папки нет - выходим из цикла
            }
        } catch (e) { break; }
    }
}

function openProject(folder, title) {
    showSection('single-project');
    document.getElementById('project-title').innerText = title;
    const grid = document.getElementById('project-images-grid');
    grid.innerHTML = '';
    for(let i = 1; i <= 100; i++) {
        const src = `img/projects/${folder}/${i}.webp`;
        const item = document.createElement('div');
        item.className = 'masonry-item';
        const img = new Image();
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
        img.onload = () => {
            img.classList.add('loaded');
            obj.element.appendChild(img);
            obj.element.onclick = () => openLightbox(src);
        };
        img.onerror = () => obj.element.remove();
        img.src = src;
    });
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