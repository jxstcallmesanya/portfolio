// ТВОЯ ПАНЕЛЬ УПРАВЛЕНИЯ СЪЕМКАМИ
const projects = [
    {
        id: 'bmw-m5',
        title: 'BMW M5 F90 Performance',
        cover: 'img/gallery/bmw/cover.jpg', // обложка
        folder: 'img/gallery/bmw/', // папка с фото
        count: 5 // сколько фото в этой папке (назови их 1.jpg, 2.jpg и т.д.)
    },
    {
        id: 'lera-portrait',
        title: 'Lera Portrait Session',
        cover: 'img/gallery/lera/cover.jpg',
        folder: 'img/gallery/lera/',
        count: 4
    }
];

function showSection(sectionId) {
    const sections = document.querySelectorAll('.split-container, .full-screen-content');
    sections.forEach(s => {
        s.classList.remove('active');
        setTimeout(() => { if(!s.classList.contains('active')) s.style.display = 'none'; }, 600);
    });

    const target = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    target.style.display = 'flex';
    setTimeout(() => target.classList.add('active'), 50);

    if(sectionId === 'gallery') renderProjects();
}

function renderProjects() {
    const list = document.getElementById('projects-list');
    list.innerHTML = '';
    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `<img src="${p.cover}"><div class="project-info"><h3>${p.title}</h3></div>`;
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

document.addEventListener('DOMContentLoaded', () => showSection('main'));