const config = {
    auto: 10,  // проверь кол-во файлов в папке
    people: 9 
};

function initGallery() {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    // Загружаем контент
    const categories = ['auto', 'people'];
    
    categories.forEach(cat => {
        for (let i = 1; i <= config[cat]; i++) {
            const img = document.createElement('img');
            img.src = `img/${cat}/${i}.jpg`;
            img.loading = "lazy";
            gallery.appendChild(img);
        }
    });
}

document.addEventListener('DOMContentLoaded', initGallery);