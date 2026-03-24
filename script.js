const config = {
    auto: 10,   // Укажи сколько фото в папке auto
    people: 5   // Укажи сколько в папке people
};

let currentImages = [];
let currentIndex = 0;

function setup() {
    // Клики по разделам
    document.querySelectorAll('.section').forEach(s => {
        s.addEventListener('click', () => openGallery(s.dataset.category));
    });

    document.getElementById('back-button').onclick = () => {
        document.getElementById('gallery-screen').classList.remove('active');
        document.getElementById('welcome-screen').classList.add('active');
    };

    // Навигация просмотрщика
    document.querySelector('.close-viewer').onclick = () => document.getElementById('photo-viewer').style.display = 'none';
    document.querySelector('.next').onclick = () => showPhoto(1);
    document.querySelector('.prev').onclick = () => showPhoto(-1);
}

function openGallery(cat) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';
    currentImages = [];
    
    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('gallery-screen').classList.add('active');

    for (let i = 1; i <= config[cat]; i++) {
        const path = `img/${cat}/${i}.jpg`;
        currentImages.push(path);

        const div = document.createElement('div');
        div.className = 'mosaic-item';
        
        // Рандом для мозаики (Wide или Tall)
        if (Math.random() > 0.8) div.classList.add('wide');
        else if (Math.random() > 0.8) div.classList.add('tall');

        const img = document.createElement('img');
        img.src = path;
        img.onclick = () => openViewer(i - 1);
        
        div.appendChild(img);
        container.appendChild(div);
    }
}

function openViewer(index) {
    currentIndex = index;
    document.getElementById('photo-viewer').style.display = 'block';
    showPhoto(0);
}

function showPhoto(dir) {
    currentIndex = (currentIndex + dir + currentImages.length) % currentImages.length;
    document.getElementById('full-photo').src = currentImages[currentIndex];
}

setup();