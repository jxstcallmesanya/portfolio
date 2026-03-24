const config = { auto: 10, people: 9 };

function loadPortfolio() {
    const gallery = document.getElementById('gallery');
    
    // Сначала грузим людей, потом машины (или наоборот)
    ['people', 'auto'].forEach(cat => {
        for (let i = 1; i <= config[cat]; i++) {
            const img = document.createElement('img');
            img.src = `img/${cat}/${i}.jpg`;
            img.loading = "lazy"; // Чтобы сайт не тормозил
            gallery.appendChild(img);
        }
    });
}

loadPortfolio();