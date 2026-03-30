// Укажи здесь реальное количество файлов, которые лежат в папках
const config = { 
    autoCount: 15, 
    peopleCount: 10 
};

function showSection(id) {
    // Скрываем все секции
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    // Показываем нужную
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }
}

function loadGrid(containerId, folder, maxCount) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    // Очищаем контейнер, чтобы не копились старые фото в памяти
    grid.innerHTML = ''; 

    for (let i = 1; i <= maxCount; i++) {
        const img = document.createElement('img');
        
        // Самая важная строка для мобилок — грузит только то, что видно на экране
        img.setAttribute('loading', 'lazy'); 
        
        // Путь к файлу
        img.src = `img/${folder}/${i}.webp`;

        // Если файла нет — просто удаляем пустой элемент, чтобы не было "битой" иконки
        img.onerror = function() { 
            this.remove(); 
        };

        // Открытие в полный экран
        img.onclick = function() {
            const lbImg = document.getElementById('lb-img');
            lbImg.src = this.src;
            document.getElementById('lightbox').style.display = 'flex';
        };

        grid.appendChild(img);
    }
}

// Функции для кнопок
function showAuto() { 
    showSection('auto'); 
    loadGrid('auto-grid', 'auto', config.autoCount); 
}

function showPeople() { 
    showSection('people'); 
    loadGrid('people-grid', 'people', config.peopleCount); 
}

// Закрытие лайтбокса
document.getElementById('lightbox').onclick = function() {
    this.style.display = 'none';
    document.getElementById('lb-img').src = ''; // Чистим память
};

// При загрузке страницы показываем главную
document.addEventListener('DOMContentLoaded', () => showSection('main'));