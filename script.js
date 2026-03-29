function showSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.split-container, .full-screen-content').forEach(section => {
        section.classList.remove('active');
    });

    // Показываем нужную
    if (sectionId === 'main') {
        document.getElementById('main-section').classList.add('active');
    } else if (sectionId === 'about') {
        document.getElementById('about-section').classList.add('active');
    } else if (sectionId === 'contact') {
        document.getElementById('contact-section').classList.add('active');
    }
}

// При загрузке показываем главную
document.addEventListener('DOMContentLoaded', () => {
    showSection('main');
});