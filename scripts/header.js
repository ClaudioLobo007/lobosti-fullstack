function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            // A função toggle adiciona a classe 'hidden' se ela não existir,
            // e remove se ela já existir. É perfeito para um menu.
            mobileMenu.classList.toggle('hidden');
        });
    }
}

// A função será chamada assim que o script for carregado na página.
setupMobileMenu();