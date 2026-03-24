const config = {
    auto: 10,
    people: 9
};

function showGallery(category) {
    const content = document.getElementById('content-area');
    content.innerHTML = '<div class="mosaic-grid"></div>';
    const grid = content.querySelector('.mosaic-grid');

    for (let i = 1; i <= config[category]; i++) {
        const img = document.createElement('img');
        img.src = `img/${category}/${i}.jpg`;
        grid.appendChild(img);
    }
    window.scrollTo(0, 0); // Прыгаем вверх при открытии категории
}