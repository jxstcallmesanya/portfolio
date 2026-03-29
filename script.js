const config = { autoCount: 20, peopleCount: 15, maxWidth: 1200 };

// Функция автоматической оптимизации "на лету"
async function optimizeImage(imgElement, src) {
    return new Promise((resolve) => {
        const tempImg = new Image();
        tempImg.src = src;
        tempImg.onload = () => {
            const canvas = document.createElement('canvas');
            let width = tempImg.width;
            let height = tempImg.height;

            // Расчет пропорций под лимит maxWidth
            if (width > config.maxWidth) {
                height = (config.maxWidth / width) * height;
                width = config.maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            // Используем качественное сглаживание
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(tempImg, 0, 0, width, height);

            // Пережимаем в WebP (качество 0.8) для скорости
            imgElement.src = canvas.toDataURL('image/webp', 0.8);
            imgElement.classList.add('loaded');
            resolve();
        };
    });
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.split-container, .full-screen-content');
    sections.forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });

    const target = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    if(target) {
        target.style.display = 'flex';
        target.scrollTop = 0;
        requestAnimationFrame(() => target.classList.add('active'));
    }
}

function generateGallery(containerId, count, folder) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for(let i = 1; i <= count; i++) {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        const img = document.createElement('img');
        
        // Запускаем оптимизацию
        optimizeImage(img, `img/${folder}/${i}.jpg`);
        
        item.appendChild(img);
        item.onclick = () => openLightbox(img.src);
        fragment.appendChild(item);
    }
    grid.appendChild(fragment);
}

function showAuto() { showSection('auto-feed'); generateGallery('auto-masonry', config.autoCount, 'auto'); }
function showPeople() { showSection('people-feed'); generateGallery('people-masonry', config.peopleCount, 'people'); }

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    lb.style.display = 'flex';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
    document.getElementById('lightbox-img').src = '';
}

document.addEventListener('DOMContentLoaded', () => showSection('main'));