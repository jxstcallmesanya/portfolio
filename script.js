function showSection(sectionId) {
    document.querySelectorAll('.split-container, .full-screen-content').forEach(section => {
        section.classList.remove('active');
        setTimeout(() => { if(!section.classList.contains('active')) section.style.display = 'none'; }, 600);
    });

    const target = document.getElementById(sectionId + '-section');
    target.style.display = 'flex';
    setTimeout(() => { target.classList.add('active'); }, 10);
}

document.addEventListener('DOMContentLoaded', () => {
    showSection('main');
});