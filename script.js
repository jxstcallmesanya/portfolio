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
        setTimeout(() => target.classList.add('active'), 10);
    }
}

function showAuto() {
    showSection('auto-feed');
    const grid = document.getElementById('auto-masonry');
    grid.innerHTML = '';
    for(let i = 1; i <= config.autoCount; i++) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
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
    document.getElementById('lightbox-img').src = src;
    lb.style.display = 'flex';
    lb.classList.add('active');
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    lb.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => showSection('main'));