// База данных проектов (пока пустая, чтобы ничего не ломалось)
const projects = [
    // Пример:
    // { id: 'test', title: 'Test Project', cover: 'img/auto_a.jpg', folder: 'img/', count: 0 }
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
        target.style.display = (sectionId === 'project-inner') ? 'block' : 'flex';
        setTimeout(() => { target.classList.add('active'); }, 50);
    }

    if(sectionId === 'gallery') renderProjects();
}

function renderProjects() {
    const list = document.getElementById('projects-list');
    if(!list) return;
    list.innerHTML = '';
    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `<img src="${p.cover}"><div style="margin-top:15px; font-size:10px; letter-spacing:2px;">${p.title}</div>`;
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