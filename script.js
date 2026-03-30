const config = {
    autoCount: 50, 
    peopleCount: 30 
};

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active');
    });
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }
}

function loadGrid(containerId, folder, maxCount) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    
    for (let i = 1; i <= maxCount; i++) {
        const img = document.createElement('img');
        img.src = `img/${folder}/${i}.webp`; 
        img.loading = "lazy";
        img.onerror = function() { this.remove(); };
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