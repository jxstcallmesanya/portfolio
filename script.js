const config = {
    auto: 10,  // твои 10 фото
    people: 5 
};

function showGallery(category) {
    const area = document.getElementById('content-area');
    area.innerHTML = `<div class="mosaic-grid" id="grid"></div>`;
    const grid = document.getElementById('grid');

    for (let i = 1; i <= config[category]; i++) {
        const img = document.createElement('img');
        img.src = `img/${category}/${i}.jpg`;
        grid.appendChild(img);
    }
}