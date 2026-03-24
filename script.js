const config = {
    auto: 10,  // замени на реальное кол-во фото
    people: 5 
};

let currentPhotos = [];
let currentIndex = 0;

function init() {
    // Установка случайного фона на главную при загрузке
    setRandomBG('auto', '#auto-bg');
    setRandomBG('people', '#people-bg');

    // Клик по разделам
    document.querySelectorAll('.split-section').forEach(sec => {
        sec.onclick = () => openGallery(sec.dataset.category);
    });

    // Назад
    document.getElementById('back-button').onclick = () => {
        document.getElementById('gallery-screen').classList.remove('active');
        document.getElementById('welcome-screen').classList.add('active');
    };

    // Viewer
    document.querySelector('.close').onclick = () => document.getElementById('viewer').style.display = 'none';
    document.querySelector('.next').onclick = () => slide(1);
    document.querySelector('.prev').onclick = () => slide(-1);
}

function setRandomBG(cat, id) {
    const randomNum = Math.floor(Math.random() * config[cat]) + 1;
    document.querySelector(id).style.backgroundImage = `url('img/${cat}/${randomNum}.jpg')`;
}

function openGallery(cat) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';
    currentPhotos = [];

    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('gallery-screen').classList.add('active');

    for (let i = 1; i <= config[cat]; i++) {
        const url = `img/${cat}/${i}.jpg`;
        currentPhotos.push(url);

        const div = document.createElement('div');
        div.className = 'item';
        
        // Рандомные размеры для мозаики
        const r = Math.random();
        if (r > 0.85) div.classList.add('w2');
        else if (r > 0.7) div.classList.add('h2');

        const img = document.createElement('img');
        img.src = url;
        img.loading = "lazy";
        img.onclick = () => {
            currentIndex = i - 1;
            document.getElementById('viewer').style.display = 'block';
            slide(0);
        };

        div.appendChild(img);
        container.appendChild(div);
    }
}

function slide(step) {
    currentIndex = (currentIndex + step + currentPhotos.length) % currentPhotos.length;
    document.getElementById('full-img').src = currentPhotos[currentIndex];
}

init();