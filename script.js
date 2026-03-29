const config = {
    autoCount: 20, 
    peopleCount: 15 
};

function showSection(sectionId) {
    const sections = document.querySelectorAll('.split-container, .full-screen-content');
    sections.forEach(s => {
        s.classList.remove('active');
        setTimeout(() => { if(!s.classList.contains('active')) s.style.display = 'none'; }, 600);
    });

    const target = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    if(target) {
        target.style.display = 'block';
        target.scrollTop = 0;
        setTimeout(() => target.classList.add('active'), 50);
    }
}

function showAuto() {
    showSection('auto-feed');
    const grid = document.getElementById('auto-masonry');
    grid.innerHTML = '';
    for(let i = 1; i <= config.autoCount; i++) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        // Фикс: если картинка не найдена, скрываем блок
        item.innerHTML = `<img src="img/auto/${i}.jpg" loading="lazy" onerror="this.parentElement.style.display='none'">`;
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
        item.innerHTML = `<img src="img/people/${i}.jpg" loading="lazy" onerror="this.parentElement.style.display='none'">`;
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

document.addEventListener('DOMContentLoaded', () => showSection('main'));