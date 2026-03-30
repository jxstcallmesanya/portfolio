const config = {
    autoCount: 49, 
    peopleCount: 21 
};

function showSection(id) {
    // Сбрасываем скролл перед переключением
    window.scrollTo(0, 0);
    
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active');
        s.scrollTop = 0; // Сброс скролла внутри самой секции
    });

    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if (target) target.classList.add('active');
}

function loadGrid(containerId, folder, count) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    
    for (let i = count; i >= 1; i--) {
        const img = document.createElement('img');
        img.src = `img/${folder}/${i}.webp`;
        img.loading = "lazy";
        img.onclick = () => openLightbox(img.src);
        grid.appendChild(img);
    }
}

function showAuto() { showSection('auto'); loadGrid('auto-grid', 'auto', config.autoCount); }
function showPeople() { showSection('people'); loadGrid('people-grid', 'people', config.peopleCount); }

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lb-img').src = src;
    lb.style.display = 'flex';
}

document.getElementById('lightbox').onclick = () => {
    document.getElementById('lightbox').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => showSection('main'));