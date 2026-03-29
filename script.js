const config = { autoCount: 20, peopleCount: 15 };

function showSection(sectionId) {
    document.querySelectorAll('.split-container, .full-screen-content').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    if(target) {
        target.style.display = 'flex';
        setTimeout(() => target.classList.add('active'), 10);
    }
}

function showAuto() {
    showSection('auto-feed');
    const grid = document.getElementById('auto-masonry');
    grid.innerHTML = '';
    for(let i = 1; i <= config.autoCount; i++) {
        grid.innerHTML += `<div class="masonry-item" onclick="openLightbox('img/auto/${i}.jpg')"><img src="img/auto/${i}.jpg" onerror="this.parentElement.style.display='none'"></div>`;
    }
}

function showPeople() {
    showSection('people-feed');
    const grid = document.getElementById('people-masonry');
    grid.innerHTML = '';
    for(let i = 1; i <= config.peopleCount; i++) {
        grid.innerHTML += `<div class="masonry-item" onclick="openLightbox('img/people/${i}.jpg')"><img src="img/people/${i}.jpg" onerror="this.parentElement.style.display='none'"></div>`;
    }
}

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    lb.style.display = 'flex';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => showSection('main'));