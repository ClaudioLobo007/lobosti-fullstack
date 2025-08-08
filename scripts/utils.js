/**
 * Mostra uma notificação (toast) no canto do ecrã.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success', 'error', ou 'info').
 */
export function showToast(message, type = 'success') {
    const toastMessage = document.getElementById('toastMessage');
    if (!toastMessage) return;

    toastMessage.textContent = message;
    toastMessage.className = `fixed top-4 right-4 text-white px-4 py-2 rounded-md shadow-lg flex items-center fade-in z-50`;
    
    if (type === 'success') toastMessage.classList.add('bg-green-500');
    else if (type === 'error') toastMessage.classList.add('bg-red-500');
    else if (type === 'info') toastMessage.classList.add('bg-blue-500');
    
    toastMessage.classList.remove('hidden');
    
    setTimeout(() => {
        toastMessage.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => {
            toastMessage.classList.add('hidden');
            toastMessage.classList.remove('opacity-0', 'transition-opacity', 'duration-300');
        }, 300);
    }, 3000);
}

/**
 * Mostra o ícone de carregamento (spinner) global.
 */
export function showLoader() {
    const generalLoader = document.getElementById('generalLoader');
    if (generalLoader) generalLoader.classList.remove('hidden');
}

/**
 * Esconde o ícone de carregamento (spinner) global.
 */
export function hideLoader() {
    const generalLoader = document.getElementById('generalLoader');
    if (generalLoader) generalLoader.classList.add('hidden');
}

/**
 * Formata um número de CNPJ com a máscara padrão (XX.XXX.XXX/YYYY-ZZ).
 * @param {string} value - O valor do CNPJ a ser formatado.
 * @returns {string} - O CNPJ formatado.
 */
export function formatCnpj(value) {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    if (value.length > 12) return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (value.length > 8) return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, '$1.$2.$3/$4');
    if (value.length > 5) return value.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3');
    if (value.length > 2) return value.replace(/^(\d{2})(\d{3})$/, '$1.$2');
    return value;
}

/**
 * Esconde todas as principais "telas" da aplicação para exibir uma nova.
 */
export function hideAllScreens() {
    const screens = [
        document.getElementById('adminDashboardScreen'),
        document.getElementById('mainAppContent'),
        document.getElementById('companyDetailsModal'),
        document.getElementById('addBillModal'),
        document.getElementById('billModal'),
        document.getElementById('barcodeFullScreenModal'),
        document.getElementById('quickUserAddModal'),
        document.getElementById('subscriptionModal'),
        document.getElementById('accessBlockedModal'),
        document.getElementById('loadingScreen')
    ];

    screens.forEach(screen => {
        if (screen) {
            screen.classList.add('hidden');
            screen.style.display = '';
        }
    });

    const openAddBillModalBtn = document.getElementById('openAddBillModalBtn');
    if (openAddBillModalBtn) {
        openAddBillModalBtn.classList.add('hidden');
        openAddBillModalBtn.style.display = '';
    }
}