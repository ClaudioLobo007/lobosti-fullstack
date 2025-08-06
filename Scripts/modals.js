// Função para configurar os listeners do modal de Termos de Serviço
function setupTermsModal() {
    const termsModal = document.getElementById('termsModal');
    const openBtn = document.getElementById('openTermsModalBtn');
    const closeBtn = document.getElementById('closeTermsModalBtn');

    if (termsModal && openBtn && closeBtn) {
        // Abre o modal ao clicar no link do rodapé
        openBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Impede que a página suba ao topo
            termsModal.classList.remove('hidden');
        });

        // Fecha o modal ao clicar no botão 'X'
        closeBtn.addEventListener('click', () => {
            termsModal.classList.add('hidden');
        });
        
        // Fecha o modal ao clicar no fundo escuro
        termsModal.addEventListener('click', (e) => {
            if (e.target === termsModal) {
                termsModal.classList.add('hidden');
            }
        });
    }
}
function setupPrivacyModal() {
    const privacyModal = document.getElementById('privacyModal');
    const openBtn = document.getElementById('openPrivacyModalBtn');
    const closeBtn = document.getElementById('closePrivacyModalBtn');

    if (privacyModal && openBtn && closeBtn) {
        // Abre o modal ao clicar no link do rodapé
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            privacyModal.classList.remove('hidden');
        });

        // Fecha o modal ao clicar no botão 'X'
        closeBtn.addEventListener('click', () => {
            privacyModal.classList.add('hidden');
        });
        
        // Fecha o modal ao clicar no fundo escuro
        privacyModal.addEventListener('click', (e) => {
            if (e.target === privacyModal) {
                privacyModal.classList.add('hidden');
            }
        });
    }
}

// Quando este script for carregado, ele executa a configuração
setupPrivacyModal();
setupTermsModal();