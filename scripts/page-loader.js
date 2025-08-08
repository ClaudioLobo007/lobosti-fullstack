/**
 * Este script é responsável por carregar componentes reutilizáveis (header, footer, modals)
 * em todas as páginas de serviços e inicializar as suas funcionalidades.
 */
document.addEventListener("DOMContentLoaded", function() {
    // 1. Identifica os locais onde os componentes serão inseridos.
    const headerPlaceholder = document.getElementById("header-placeholder");
    const footerPlaceholder = document.getElementById("footer-placeholder");
    const modalsPlaceholder = document.getElementById("modals-placeholder");

    // 2. Determina o caminho base para encontrar a pasta de componentes.
    // Se a página estiver dentro de /pages/, o caminho será '../'. Caso contrário, será './'.
    const basePath = window.location.pathname.includes('/pages/') ? '../' : './';

    /**
     * Função reutilizável para buscar o conteúdo de um ficheiro HTML e inseri-lo num placeholder.
     * @param {string} url - O caminho para o ficheiro do componente.
     * @param {HTMLElement} placeholder - O elemento onde o conteúdo será inserido.
     */
    const loadComponent = (url, placeholder) => {
        return fetch(url)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Erro ao carregar componente: ${url}`);
                }
                return res.text();
            })
            .then(data => {
                if (placeholder) placeholder.innerHTML = data;
            });
    };

    // 3. Carrega todos os componentes em paralelo para um carregamento mais rápido.
    Promise.all([
        loadComponent(`${basePath}components/header.html`, headerPlaceholder),
        loadComponent(`${basePath}components/footer.html`, footerPlaceholder),
        loadComponent(`${basePath}components/modals.html`, modalsPlaceholder)
    ]).then(() => {
        // 4. Após todos os componentes serem carregados, inicializa os seus scripts.

        // Inicializa a lógica dos modais (termos de uso, privacidade)
        const modalScript = document.createElement('script');
        modalScript.src = `${basePath}scripts/modals.js`;
        document.body.appendChild(modalScript);

        // Inicializa a lógica do menu mobile do cabeçalho
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
        const copyrightTextElement = document.getElementById('copyright-text');
        if (copyrightTextElement) {
            const currentYear = new Date().getFullYear();
            copyrightTextElement.innerHTML = `&copy; ${currentYear} LobosTI. Todos os direitos reservados.`;
        }

    }).catch(error => console.error("Erro crítico ao carregar componentes:", error));
});