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
        target.scrollTop = 0; 
        requestAnimationFrame(() => target.classList.add('active'));
    }
}

// Усиленная ленивая загрузка (Lazy Loading)
function generateGallery(containerId, count, path) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    
    // Создаем фрагмент документа, чтобы не перерисовывать страницу 20 раз
    const fragment = document.createDocumentFragment();

    for(let i = 1; i <= count; i++) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        
        const img = document.createElement('img');
        img.src = `img/${path}/${i}.jpg`;
        // loading="lazy" заставляет браузер грузить фото только при подходе к ним
        // decoding="async" не блокирует поток отрисовки
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        img.setAttribute('alt', `Photo ${i}`);
        
        // Показываем картинку только когда она физически загрузилась
        img.onload = () => { img.classList.add('loaded'); };
        // Скрываем блок целиком, если фото вообще не найдено
        img.onerror = () => { item.style.display = 'none'; };
        
        item.appendChild(img);
        item.onclick = () => openLightbox(img.src);
        fragment.appendChild(item);
    }
    grid.appendChild(fragment);
}

function showAuto() {
    showSection('auto-feed');
    generateGallery('auto-masonry', config.autoCount, 'auto');
}

function showPeople() {
    showSection('people-feed');
    generateGallery('people-masonry', config.peopleCount, 'people');
}

// Лайтбокс: предзагрузка картинки
function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    lb.style.display = 'flex';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
    document.getElementById('lightbox-img').src = ''; // Очищаем память
}

document.addEventListener('DOMContentLoaded', () => showSection('main'));