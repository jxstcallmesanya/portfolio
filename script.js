const config = { autoCount: 20, peopleCount: 15 };

function showSection(sectionId) {
    const sections = document.querySelectorAll('.split-container, .full-screen-content');
    sections.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });

    const target = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    if(target) {
        target.style.display = 'flex';
        target.scrollTop = 0; // Всегда начинаем просмотр сверху
        requestAnimationFrame(() => target.classList.add('active'));
    }
}

function generateGallery(containerId, count, folder) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for(let i = 1; i <= count; i++) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        
        const img = document.createElement('img');
        img.src = `img/${folder}/${i}.jpg`;
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        
        img.onload = () => img.classList.add('loaded');
        img.onerror = () => item.style.display = 'none';
        
        item.appendChild(img);
        item.onclick = () => openLightbox(img.src);
        fragment.appendChild(item);
    }
    grid.appendChild(fragment);
}

function showAuto() { showSection('auto-feed'); generateGallery('auto-masonry', config.autoCount, 'auto'); }
function showPeople() { showSection('people-feed'); generateGallery('people-masonry', config.peopleCount, 'people'); }

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    lb.style.display = 'flex';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
    document.getElementById('lightbox-img').src = '';
}

document.addEventListener('DOMContentLoaded', () => showSection('main'));