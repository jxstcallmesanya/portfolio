const config = {
    autoCount: 50, // Макс. кол-во фото в папке auto
    peopleCount: 30 // Макс. кол-во фото в папке people
};

function showSection(id) {
    // Скрываем всё
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active');
    });
    
    // Показываем нужную
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0); // Скролл вверх
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
        
        // Если файла нет — удаляем пустой элемент
        img.onerror = function() { this.remove(); };
        
        img.onclick = () => openLightbox(img.src);
        grid.appendChild(img);
    }
}

// Функции для кнопок на главной
function showAuto() { 
    showSection('auto'); 
    loadGrid('auto-grid', 'auto', config.autoCount); 
}

function showPeople() { 
    showSection('people'); 
    loadGrid('people-grid', 'people', config.peopleCount); 
}

// Лайтбокс
function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lb-img').src = src;
    lb.style.display = 'flex';
}

document.getElementById('lightbox').onclick = () => {
    document.getElementById('lightbox').style.display = 'none';
};

// Запуск главной
document.addEventListener('DOMContentLoaded', () => showSection('main'));