// --- НАСТРОЙКИ (УКАЖИ КОЛИЧЕСТВО ФОТО В ПАПКАХ) ---
const config = {
    auto: 10,  // Сколько фото в img/auto/ (например, 10)
    people: 5  // Сколько фото в img/people/ (например, 5)
};

let currentPhotos = [];
let currentIndex = 0;

function init() {
    setupMenuHover();
    setupNavigation();
    setupPhotoViewer();
}

// 1. ЛОГИКА НАВЕДЕНИЯ (СМЕНА ФОНА)
function setupMenuHover() {
    const bgOverlay = document.getElementById('bg-overlay');
    const menuLinks = document.querySelectorAll('.menu-link');

    menuLinks.forEach(link => {
        // При наведении мышки
        link.addEventListener('mouseenter', () => {
            const category = link.getAttribute('data-category');
            
            // Берем случайное фото из папки
            const randomNum = Math.floor(Math.random() * config[category]) + 1;
            const photoPath = `img/${category}/${randomNum}.jpg`;

            // Устанавливаем фон и делаем его видимым
            bgOverlay.style.backgroundImage = `url('${photoPath}')`;
            bgOverlay.classList.add('visible');
        });

        // Когда мышка уходит
        link.addEventListener('mouseleave', () => {
            // Убираем фон
            bgOverlay.classList.remove('visible');
        });
    });
}

// 2. ЛОГИКА КЛИКА И ГАЛЕРЕИ
function setupNavigation() {
    const mainMenu = document.getElementById('main-menu');
    const galleryScreen = document.getElementById('gallery-screen');
    const menuLinks = document.querySelectorAll('.menu-link');
    const backButton = document.getElementById('back-button');

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Убираем стандартное поведение ссылки
            const category = link.getAttribute('data-category');
            
            // Переключаем экраны
            mainMenu.classList.remove('active');
            galleryScreen.classList.add('active');
            document.body.style.overflowY = 'auto'; // Включаем скролл

            // Генерируем мозаику
            generateMosaicGrid(category);
        });
    });

    // Назад
    backButton.addEventListener('click', () => {
        galleryScreen.classList.remove('active');
        mainMenu.classList.add('active');
        document.body.style.overflowY = 'hidden'; // Скрываем скролл
        // Убираем фон, если он вдруг остался
        document.getElementById('bg-overlay').classList.remove('visible');
    });
}

// ГЕНЕРАЦИЯ МОЗАИКИ (Из предыдущей логики)
function generateMosaicGrid(category) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';
    currentPhotos = [];

    const numPhotos = config[category];

    for (let i = 1; i <= numPhotos; i++) {
        const photoPath = `img/${category}/${i}.jpg`;
        currentPhotos.push(photoPath);

        const item = document.createElement('div');
        item.className = 'grid-item';
        
        // Рандомные размеры для мозаики
        const r = Math.random();
        if (r > 0.8) item.classList.add('w2'); // 20% шанс на широкое фото
        else if (r > 0.8) item.classList.add('h2'); // 20% шанс на высокое фото

        const img = document.createElement('img');
        img.src = photoPath;
        
        // Клик по фото
        img.onclick = () => {
            currentIndex = i - 1;
            openViewer();
        };

        item.appendChild(img);
        container.appendChild(item);
    }
}

// 3. ПРОСМОТРЩИК (ПОП-АП)
function setupPhotoViewer() {
    document.querySelector('.close-viewer').onclick = closeViewer;
    document.querySelector('.next').onclick = () => changePhoto(1);
    document.querySelector('.prev').onclick = () => changePhoto(-1);
    
    // Закрытие по клику на фон
    document.getElementById('viewer').onclick = (e) => {
        if (e.target === document.getElementById('viewer')) closeViewer();
    };
}

function openViewer() {
    document.getElementById('viewer').style.display = 'block';
    document.body.style.overflowY = 'hidden'; // Скрываем скролл галереи
    updateViewerPhoto();
}

function closeViewer() {
    document.getElementById('viewer').style.display = 'none';
    document.body.style.overflowY = 'auto'; // Возвращаем скролл
}

function changePhoto(dir) {
    currentIndex = (currentIndex + dir + currentPhotos.length) % currentPhotos.length;
    updateViewerPhoto();
}

function updateViewerPhoto() {
    document.getElementById('full-photo').src = currentPhotos[currentIndex];
}

// Запуск
init();