const config = { autoCount: 50, peopleCount: 50 };

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id + '-section') || document.getElementById(id);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }
}

// Умная загрузка: проверяем файл перед вставкой в DOM
async function loadGrid(containerId, folder, maxCount) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    grid.innerHTML = ''; 
    
    for (let i = 1; i <= maxCount; i++) {
        const imgPath = `img/${folder}/${i}.webp`;
        
        try {
            // Проверяем, существует ли файл (HEAD запрос не качает саму картинку, только инфу)
            const response = await fetch(imgPath, { method: 'HEAD' });
            
            if (response.ok) {
                const img = document.createElement('img');
                img.setAttribute('loading', 'lazy');
                img.src = imgPath;
                
                img.onclick = () => {
                    const lbImg = document.getElementById('lb-img');
                    lbImg.src = imgPath;
                    document.getElementById('lightbox').style.display = 'flex';
                };
                
                grid.appendChild(img);
            } else {
                // Если файл не найден (404), прекращаем цикл для этой папки
                break; 
            }
        } catch (e) {
            break; 
        }
    }
}

function showAuto() { 
    showSection('auto'); 
    loadGrid('auto-grid', 'auto', config.autoCount); 
}

function showPeople() { 
    showSection('people'); 
    loadGrid('people-grid', 'people', config.peopleCount); 
}

document.getElementById('lightbox').onclick = () => {
    document.getElementById('lightbox').style.display = 'none';
    document.getElementById('lb-img').src = ''; 
};

document.addEventListener('DOMContentLoaded', () => showSection('main'));