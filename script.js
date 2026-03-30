const config = { autoCount: 50, peopleCount: 50 };

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }
}

// Глобальная переменная для контроля загрузки
let currentGridData = { folder: '', count: 0, loaded: 0 };

async function loadGrid(containerId, folder, maxCount) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    // Очищаем всё и сбрасываем счетчики
    grid.innerHTML = '';
    currentGridData = { folder, count: maxCount, loaded: 0 };

    // Загружаем первые 10 штук сразу, остальное — через микро-паузу
    renderBatch(grid, folder, 1, 10);
    
    setTimeout(() => {
        renderBatch(grid, folder, 11, maxCount);
    }, 100);
}

function renderBatch(container, folder, start, end) {
    const fragment = document.createDocumentFragment();
    
    for (let i = start; i <= end; i++) {
        const img = document.createElement('img');
        img.style.display = 'none'; // Скрываем, пока не загрузится
        img.setAttribute('loading', 'lazy');
        img.src = `img/${folder}/${i}.webp`;
        
        img.onload = () => {
            img.style.display = 'block';
        };

        img.onerror = () => {
            img.remove(); // Просто удаляем, если файла нет (фикс 404)
        };

        img.onclick = () => {
            const lbImg = document.getElementById('lb-img');
            lbImg.src = img.src;
            document.getElementById('lightbox').style.display = 'flex';
        };

        fragment.appendChild(img);
    }
    container.appendChild(fragment);
}

function showAuto() { 
    showSection('auto'); 
    loadGrid('auto-grid', 'auto', config.autoCount); 
}

function showPeople() { 
    showSection('people'); 
    loadGrid('people-grid', 'people', config.peopleCount); 
}

// Лайтбокс
document.getElementById('lightbox').onclick = () => {
    document.getElementById('lightbox').style.display = 'none';
    document.getElementById('lb-img').src = ''; 
};

document.addEventListener('DOMContentLoaded', () => showSection('main'));