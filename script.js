// Твоя база данных съемок
const projects = [
    /* Пример добавления:
    { 
        id: 'car-shoot', 
        title: 'BMW M5 F90 Фотосет', 
        cover: 'img/gallery/bmw/cover.jpg', 
        folder: 'img/gallery/bmw/', 
        count: 5 
    },
    */
];

function showSection(sectionId) {
    const sections = document.querySelectorAll('.split-container, .full-screen-content');
    
    sections.forEach(section => {
        section.classList.remove('active');
        setTimeout(() => { 
            if(!section.classList.contains('active')) section.style.display = 'none'; 
        }, 600);
    });

    const target = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    if(target) {
        // Если это просмотр фото внутри съемки, используем block для скролла, иначе flex
        target.style.display = (sectionId === 'project-inner') ? 'block' : 'flex';
        setTimeout(() => { target.classList.add('active'); }, 50);
    }

    if(sectionId === 'gallery') renderProjects();
}

function renderProjects() {
    const list = document.getElementById('projects-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(projects.length === 0) {
        list.innerHTML = '<p style="opacity:0.3; letter-spacing:2px;">Здесь скоро появятся новые работы...</p>';
        return;
    }

    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `<img src="${p.cover}"><div style="margin-top:15px; font-size:10px; letter-spacing:2px; opacity:0.6;">${p.title}</div>`;
        card.onclick = () => openProject(p);
        list.appendChild(card);
    });
}

function openProject(p) {
    showSection('project-inner');
    document.getElementById('project-title').innerText = p.title;
    const container = document.getElementById('project-photos');
    container.innerHTML = '';
    for(let i = 1; i <= p.count; i++) {
        const img = document.createElement('img');
        img.src = `${p.folder}${i}.jpg`;
        container.appendChild(img);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    showSection('main');
});