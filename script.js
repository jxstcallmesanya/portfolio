// --- 1. НАСТРОЙКИ (УКАЖИ КОЛИЧЕСТВО ФОТО) ---

// Важно: Фото в папках должны называться 1.jpg, 2.jpg, 3.jpg и т.д.
const config = {
    auto: 15,   // Количество фото в папке img/auto/
    people: 12  // Количество фото в папке img/people/
};

// Глобальные переменные для просмотра фото
let currentGalleryImages = [];
let currentPhotoIndex = 0;

// --- 2. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ---
window.addEventListener('DOMContentLoaded', () => {
    // Заполняем фоновые сетки на начальном экране
    populateBackgroundGrid('auto', 'auto-bg');
    populateBackgroundGrid('people', 'people-bg');

    // Настраиваем логику переключения экранов
    setupNavigation();
    
    // Настраиваем логику просмотрщика фото
    setupPhotoViewer();
});

// --- 3. ЛОГИКА ОТОБРАЖЕНИЯ (ФУНКЦИИ) ---

// Функция для заполнения фона разделов (Auto/People)
function populateBackgroundGrid(category, gridId) {
    const grid = document.getElementById(gridId);
    const numPhotos = config[category];
    const totalCells = 20; // Сколько картинок в фоне для мозаики

    for (let i = 0; i < totalCells; i++) {
        const img = document.createElement('img');
        // Берем случайное фото из папки
        const randomPhotoId = Math.floor(Math.random() * numPhotos) + 1;
        img.src = `img/${category}/${randomPhotoId}.jpg`;
        grid.appendChild(img);
    }
}

// Навигация между начальным экраном и галереей
function setupNavigation() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const galleryScreen = document.getElementById('gallery-screen');
    const sections = document.querySelectorAll('.section');
    const backButton = document.getElementById('back-button');

    // Клик на раздел (Auto или People)
    sections.forEach(section => {
        section.addEventListener('click', () => {
            const category = section.getAttribute('data-category');
            
            // 1. Скрываем начальный экран, показываем галерею
            welcomeScreen.classList.remove('active');
            galleryScreen.classList.add('active');
            document.body.style.overflow = 'auto'; // Включаем скролл

            // 2. Генерируем мозаичную галерею
            generateMosaicGallery(category);
        });
    });

    // Клик на кнопку "Назад"
    backButton.addEventListener('click', () => {
        galleryScreen.classList.remove('active');
        welcomeScreen.classList.add('active');
        document.body.style.overflow = 'hidden'; // Отключаем скролл
    });
}

// --- ГЛАВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ МОЗАИКИ ---
function generateMosaicGallery(category) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = ''; // Очищаем старую галерею
    
    const numPhotos = config[category];
    currentGalleryImages = []; // Сбрасываем список для просмотрщика

    // Создаем массив имен файлов (1.jpg, 2.jpg...)
    const photoFiles = [];
    for (let i = 1; i <= numPhotos; i++) {
        photoFiles.push(`${i}.jpg`);
    }

    // Перемешиваем массив, чтобы порядок был рандомным
    shuffleArray(photoFiles);

    // Генерируем элементы мозаики
    photoFiles.forEach((fileName, index) => {
        const photoPath = `img/${category}/${fileName}`;
        currentGalleryImages.push(photoPath); // Сохраняем для просмотрщика

        const item = document.createElement('div');
        item.className = 'mosaic-item';
        
        // --- ЛОГИКА ХАОТИЧНОЙ МОЗАИКИ ---
        // Случайным образом назначаем, будет ли фото широким или высоким.
        // Главное правило мозаики: не делать слишком много спец-классов подряд.
        
        const random = Math.random();
        
        // 20% шанс, что фото будет широким (занимает 2 колонки)
        if (random < 0.2) {
            item.classList.add('wide');
        } 
        // 15% шанс, что фото будет высоким (занимает 2 строки)
        else if (random < 0.35) {
            item.classList.add('tall');
        }
        // В остальных 65% случаев фото будет обычным (1x1)

        const img = document.createElement('img');
        img.src = photoPath;
        img.alt = `${category} photo ${index + 1}`;
        
        item.appendChild(img);
        
        // Добавляем событие клика для открытия просмотрщика
        item.addEventListener('click', () => {
            openViewer(index);
        });
        
        container.appendChild(item);
    });
}

// Простая функция для перемешивания массива (Фишер-Йетс)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[array[i]]];
    }
}

// --- ЛОГИКА ПРОСМОТРЩИКА ФОТО (ПОП-АП) ---
function setupPhotoViewer() {
    const viewer = document.getElementById('photo-viewer');
    const closeBtn = document.querySelector('.close-viewer');
    const prevBtn = document.querySelector('.nav-button.prev');
    const nextBtn = document.querySelector('.nav-button.next');

    // Закрыть при клике на крестик
    closeBtn.addEventListener('click', closeViewer);
    
    // Закрыть при клике на темный фон
    viewer.addEventListener('click', (e) => {
        if (e.target === viewer) closeViewer();
    });

    // Кнопки навигации
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Чтобы не сработал клик по фону
        changePhoto(-1);
    });
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        changePhoto(1);
    });

    // Навигация с клавиатуры
    document.addEventListener('keydown', (e) => {
        if (!viewer.style.display || viewer.style.display === 'none') return;
        
        if (e.key === 'Escape') closeViewer();
        if (e.key === 'ArrowLeft') changePhoto(-1);
        if (e.key === 'ArrowRight') changePhoto(1);
    });
}

function openViewer(index) {
    currentPhotoIndex = index;
    const viewer = document.getElementById('photo-viewer');
    const fullPhoto = document.getElementById('full-photo');
    
    fullPhoto.src = currentGalleryImages[currentPhotoIndex];
    viewer.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Отключаем скролл страницы
}

function closeViewer() {
    const viewer = document.getElementById('photo-viewer');
    viewer.style.display = 'none';
    document.body.style.overflow = 'auto'; // Включаем скролл галереи
}

function changePhoto(direction) {
    currentPhotoIndex += direction;
    
    // Зацикливание галереи
    if (currentPhotoIndex >= currentGalleryImages.length) {
        currentPhotoIndex = 0;
    }
    if (currentPhotoIndex < 0) {
        currentPhotoIndex = currentGalleryImages.length - 1;
    }
    
    const fullPhoto = document.getElementById('full-photo');
    // Добавляем легкую анимацию смены
    fullPhoto.style.animation = 'none';
    fullPhoto.offsetHeight; // Триггер рефлоу
    fullPhoto.style.animation = 'zoomIn 0.3s ease';
    
    fullPhoto.src = currentGalleryImages[currentPhotoIndex];
}