const config = { autoCount: 50, peopleCount: 50 };

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }
}

function loadGrid(containerId, folder, maxCount) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    
    // Очищаем сетку перед новой загрузкой, чтобы освободить память
    grid.innerHTML = ''; 

    for (let i = 1; i <= maxCount; i++) {
        const img = document.createElement('img');
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ:
        // loading="lazy" заставляет браузер грузить фото только при скролле
        img.setAttribute('loading', 'lazy'); 
        
        img.src = `img/${folder}/${i}.webp`;
        
        img.onerror = function() { 
            this.remove(); 
        };

        img.onclick = () => {
            const lbImg = document.getElementById('lb-img');
            lbImg.src = img.src;
            document.getElementById('lightbox').style.display = 'flex';
        };
        
        grid.appendChild(img);
    }
}

function showAuto() { 
    showSection('auto'); 
    loadGrid('auto-grid', 'auto', config.autoCount); 
}

function showPeople() { 
    showSection('people'); 
    loadGrid('people-grid', 'people', config.peopleCount); 
}

// Закрытие лайтбокса
document.getElementById('lightbox').onclick = () => { 
    document.getElementById('lightbox').style.display = 'none'; 
    document.getElementById('lb-img').src = ''; // Очищаем путь, чтобы выгрузить из памяти
};

document.addEventListener('DOMContentLoaded', () => showSection('main'));