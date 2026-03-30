// Точное количество файлов из твоих папок
const config = { 
    autoCount: 49, 
    peopleCount: 15 
};

function showSection(id) {
    // Скрываем все секции, включая главную и галереи
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    // Показываем нужную секцию
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0); // Всегда прыгаем вверх при переключении
    }
}

function loadGrid(containerId, folder, maxCount) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    // Очищаем контейнер перед загрузкой, чтобы не дублировать фото
    grid.innerHTML = ''; 

    for (let i = 1; i <= maxCount; i++) {
        const img = document.createElement('img');
        
        // Важно для мобилок: грузим только то, что доскроллили
        img.setAttribute('loading', 'lazy'); 
        
        // Путь к фото: img/auto/1.webp и т.д.
        img.src = `img/${folder}/${i}.webp`;

        // Удаляем элемент, если вдруг файл битый или не загрузился
        img.onerror = function() { 
            this.remove(); 
        };

        // Клик для открытия в лайтбоксе
        img.onclick = function() {
            const lbImg = document.getElementById('lb-img');
            lbImg.src = this.src;
            document.getElementById('lightbox').style.display = 'flex';
        };

        grid.appendChild(img);
    }
}

// Функции-обертки для кнопок на главной
function showAuto() { 
    showSection('auto'); 
    loadGrid('auto-grid', 'auto', config.autoCount); 
}

function showPeople() { 
    showSection('people'); 
    loadGrid('people-grid', 'people', config.peopleCount); 
}

// Закрытие лайтбокса при клике в любое место
document.getElementById('lightbox').onclick = function() {
    this.style.display = 'none';
    document.getElementById('lb-img').src = ''; // Очистка памяти
};

// Инициализация при первом открытии
document.addEventListener('DOMContentLoaded', () => {
    showSection('main');
});