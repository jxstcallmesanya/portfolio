const config = {
    autoCount: 49,
    peopleCount: 21
};

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

function loadArchive(containerId, folder, count) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    
    // Создаем массив плейсхолдеров, чтобы зафиксировать порядок
    const items = [];
    for(let i = count; i >= 1; i--) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        grid.appendChild(item);
        items.push({ num: i, element: item });
    }

    // Загружаем фото в созданные блоки
    items.forEach(obj => {
        const src = `img/${folder}/${obj.num}.webp`;
        const img = new Image();
        img.src = src;
        img.loading = "lazy";
        
        img.onload = () => {
            img.classList.add('loaded');
            obj.element.appendChild(img);
            obj.element.onclick = () => openLightbox(src);
        };
        img.onerror = () => obj.element.remove();
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