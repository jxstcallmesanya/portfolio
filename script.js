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

    grid.innerHTML = ''; // Очистка
    
    let loadedAny = false;
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= maxCount; i++) {
        const img = document.createElement('img');
        img.setAttribute('loading', 'lazy');
        // Путь должен строго соответствовать папкам: img/auto/1.webp
        img.src = `img/${folder}/${i}.webp`; 
        
        img.onload = () => {
            img.style.opacity = '1';
            loadedAny = true;
        };

        img.onerror = function() {
            this.remove(); // Удаляем битую ссылку из DOM
        };

        img.onclick = () => {
            const lbImg = document.getElementById('lb-img');
            lbImg.src = this.src;
            document.getElementById('lightbox').style.display = 'flex';
        };

        fragment.appendChild(img);
    }
    
    grid.appendChild(fragment);

    // Если через 2 секунды ничего не появилось — выведем инфо в консоль для отладки
    setTimeout(() => {
        if (!grid.querySelector('img')) {
            console.warn(`В папке img/${folder}/ не найдено подходящих файлов 1.webp, 2.webp...`);
        }
    }, 2000);
}

function showAuto() { 
    showSection('auto'); 
    loadGrid('auto-grid', 'auto', config.autoCount); 
}

function showPeople() { 
    showSection('people'); 
    loadGrid('people-grid', 'people', config.peopleCount); 
}

document.getElementById('lightbox').onclick = () => {
    document.getElementById('lightbox').style.display = 'none';
    document.getElementById('lb-img').src = ''; 
};

document.addEventListener('DOMContentLoaded', () => showSection('main'));