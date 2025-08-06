document.addEventListener('DOMContentLoaded', function() {
    // --- Elementos HTML (Declarações completas) ---
    const initialLoginScreen = document.getElementById('initialLoginScreen');
    const showCnpjLoginBtn = document.getElementById('showCnpjLoginBtn');
    const showAdminLoginBtn = document.getElementById('showAdminLoginBtn');
    const backToInitialLoginBtnCnpj = document.getElementById('backToInitialLoginBtnCnpj');
    const backToInitialLoginBtnAdmin = document.getElementById('backToInitialLoginBtnAdmin');
    const cnpjLoginScreen = document.getElementById('cnpjLoginScreen');
    const cnpjLoginForm = document.getElementById('cnpjLoginForm');
    const cnpjInput = document.getElementById('cnpjInput');
    const cnpjPasswordInput = document.getElementById('cnpjPasswordInput');
    const adminLoginScreen = document.getElementById('adminLoginScreen');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminUsernameInput = document.getElementById('adminUsernameInput');
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    const adminDashboardScreen = document.getElementById('adminDashboardScreen');
    const companyListDiv = document.getElementById('companyList');
    const noCompaniesMessage = document.getElementById('noCompaniesMessage');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const createCompanyBtn = document.getElementById('createCompanyBtn');
    const userLoginScreen = document.getElementById('userLoginScreen');
    const userLoginForm = document.getElementById('userLoginForm');
    const userInput = document.getElementById('userInput');
    const userPasswordInput = document.getElementById('userPasswordInput');
    const registerUserBtn = document.getElementById('registerUserBtn');
    const backToCnpjLoginBtn = document.getElementById('backToCnpjLoginBtn');
    const welcomeUserText = document.getElementById('welcomeUserText');
    const mainAppContent = document.getElementById('mainAppContent');
    const toastMessage = document.getElementById('toastMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const backToAdminBtn = document.getElementById('backToAdminBtn');
    const addBillModal = document.getElementById('addBillModal');
    const openAddBillModalBtn = document.getElementById('openAddBillModalBtn');
    const closeAddBillModalBtn = document.getElementById('closeAddBillModalBtn');
    const companyDetailsModal = document.getElementById('companyDetailsModal');
    const closeCompanyModalBtn = document.getElementById('closeCompanyModal');
    const modalCompanyName = document.getElementById('modalCompanyName');
    const modalCompanyCnpj = document.getElementById('modalCompanyCnpj');
    const modalCompanyPasswordInput = document.getElementById('modalCompanyPasswordInput');
    const modalCompanyUsers = document.getElementById('modalCompanyUsers');
    const deleteCompanyBtn = document.getElementById('deleteCompanyBtn');
    const addUserBtn = document.getElementById('addUserBtn');
    const saveCompanyDetailsBtn = document.getElementById('saveCompanyDetailsBtn');
    const billModal = document.getElementById('billModal');
    const closeModalBtn = document.getElementById('closeModal');
    const saveBillBtn = document.getElementById('saveBill');
    const deleteBillBtn = document.getElementById('deleteBill');
    const deleteEntireBillBtn = document.getElementById('deleteEntireBillBtn');
    const modalBillPaidCheckbox = document.getElementById('modalBillPaid');
    const modalBillBarcodeInput = document.getElementById('modalBillBarcode');
    const barcodeFullScreenModal = document.getElementById('barcodeFullScreenModal');
    const showFullScreenBarcodeBtn = document.getElementById('showFullScreenBarcodeBtn');
    const closeFullScreenBarcodeBtn = document.getElementById('closeFullScreenBarcodeBtn');
    const quickUserAddModal = document.getElementById('quickUserAddModal');
    const closeQuickUserAddModal = document.getElementById('closeQuickUserAddModal');
    const cancelQuickUserAdd = document.getElementById('cancelQuickUserAdd');
    const quickUserAddForm = document.getElementById('quickUserAddForm');
    const settingsMenuContainer = document.getElementById('settingsMenuContainer');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsDropdown = document.getElementById('settingsDropdown');
    const menuEmpresa = document.getElementById('menuEmpresa');
    const menuUsuarios = document.getElementById('menuUsuarios');
    const menuPermissoes = document.getElementById('menuPermissoes');
    const permissionsModal = document.getElementById('permissionsModal');
    const closePermissionsModal = document.getElementById('closePermissionsModal');
    const permissionsContainer = document.getElementById('permissionsContainer');
    const billForm = document.getElementById('billForm');
    const installmentsPreview = document.getElementById('installmentsPreview');
    const installmentsList = document.getElementById('installmentsList');
    const addToOrganizer = document.getElementById('addToOrganizer');
    const totalBillsSpan = document.getElementById('totalBills');
    const parcelPreviewTotalSpan = document.getElementById('parcelPreviewTotal');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');

    // --- Variáveis de Dados e Estado ---
    let currentLoggedInCompany = null;
    let currentLoggedInUser = null;
    let isAdminLoggedIn = false;
    let loggedInViaAdmin = false;
    let selectedCompanyForAdmin = null;
    let currentBill = {};
    let selectedParcel = null;
    let userBoletos = [];
    let currentMonth, currentYear;


    // --- Lógica para o Modal de Adicionar Boletos ---
    openAddBillModalBtn.addEventListener('click', () => {
        clearBillForm();
        addBillModal.classList.remove('hidden');
    });
    closeAddBillModalBtn.addEventListener('click', () => {
        addBillModal.classList.add('hidden');
    });
    addBillModal.addEventListener('click', (e) => {
        if (e.target === addBillModal) {
            addBillModal.classList.add('hidden');
        }
    });
    // --- Lógica para o Modal de Código de Barras em Tela Cheia ---
    showFullScreenBarcodeBtn.addEventListener('click', () => {
        const originalBarcode = document.getElementById('modalBillBarcodeInput').value || '';
        if (!originalBarcode) return;
        const cleanBarcode = originalBarcode.replace(/\D/g, '');
        if (cleanBarcode.length > 0 && cleanBarcode.length % 2 === 0) {
            try {
                JsBarcode("#fullScreenBarcodeImage", cleanBarcode,
                    {
                        format: "ITF",
                        width: 1.5,
                        height: 80,
                        displayValue: true,
                        fontSize: 20,
                        lineColor: "#000",
                        background: "#FFF"
                    });
                barcodeFullScreenModal.classList.remove('hidden');
            }
            catch (e) {
                showToast("Erro ao gerar código de barras.", "error");
            }
        }
        else {
            showToast("Código de barras inválido (deve ter quantidade par de números).", "error");
        }
    });
    closeFullScreenBarcodeBtn.addEventListener('click', () => barcodeFullScreenModal.classList.add('hidden'));
    barcodeFullScreenModal.addEventListener('click', (e) => {
        if (e.target === barcodeFullScreenModal) barcodeFullScreenModal.classList.add('hidden');
    });

    // Listener para o item "Gerenciar Usuários"
    menuUsuarios.addEventListener('click', (e) => {
        e.preventDefault();
        settingsDropdown.classList.add('hidden');
        const companyId = isAdminLoggedIn ? selectedCompanyForAdmin._id : currentLoggedInCompany._id;
        if (companyId) fetchCompanyDetailsAndOpenModal(companyId);
    });



// --- Lógica para o Menu de Configurações (Engrenagem) ---
settingsBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    settingsDropdown.classList.toggle('hidden');
});

window.addEventListener('click', () => {
    if (!settingsDropdown.classList.contains('hidden')) {
        settingsDropdown.classList.add('hidden');
    }
});

// Função auxiliar para os links de Empresa e Usuários
const openManagementModal = (e) => {
    e.preventDefault();
    settingsDropdown.classList.add('hidden');
    const companyId = currentLoggedInCompany ? currentLoggedInCompany._id : null;
    if (companyId) {
        fetchCompanyDetailsAndOpenModal(companyId);
    }
};

// Anexa a função aos links corretos
menuEmpresa.addEventListener('click', openManagementModal);
menuUsuarios.addEventListener('click', openManagementModal);

// Listener EXCLUSIVO para o link de Permissões
menuPermissoes.addEventListener('click', async (e) => {
    e.preventDefault();
    settingsDropdown.classList.add('hidden');

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:5000/api/permissions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const permissions = await response.json();
        if (!response.ok) throw new Error(permissions.message);

        // Preenche o formulário com as permissões atuais
        document.querySelector(`input[name="gerente-canUpdate"][value="${permissions.Gerente.canUpdate}"]`).checked = true;
        document.querySelector(`input[name="gerente-canDelete"][value="${permissions.Gerente.canDelete}"]`).checked = true;

        document.querySelector(`input[name="funcionario-canUpdate"][value="${permissions.Funcionário.canUpdate}"]`).checked = true;
        document.querySelector(`input[name="funcionario-canDelete"][value="${permissions.Funcionário.canDelete}"]`).checked = true;

        permissionsModal.classList.remove('hidden');
    } catch (error) {
        showToast('Erro ao carregar permissões: ' + error.message, 'error');
    }
});

// Listener para fechar o modal de permissões
closePermissionsModal.addEventListener('click', () => {
    permissionsModal.classList.add('hidden');
});

// Listener para salvar as alterações de permissão automaticamente
permissionsContainer.addEventListener('change', async (e) => {
    const target = e.target;
    if (target.type !== 'radio') return;

    const roleToUpdate = target.closest('[data-role]').dataset.role;
    const permissionKey = target.name.split('-')[1];
    const permissionValue = target.value;

    const payload = {
        roleToUpdate,
        permissions: { [permissionKey]: permissionValue }
    };

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:5000/api/permissions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        showToast(data.message, 'success');
    } catch (error) {
        showToast('Erro ao salvar permissão: ' + error.message, 'error');
    }
});

    // --- Lógica para o Modal de Cadastro Rápido de Usuário ---
    function closeQuickAddModal() {
        quickUserAddModal.classList.add('hidden');
    }
    closeQuickUserAddModal.addEventListener('click', closeQuickAddModal);
    cancelQuickUserAdd.addEventListener('click', closeQuickAddModal);
    quickUserAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('quickAddUsername').value;
        const password = document.getElementById('quickAddPassword').value;
        if (!currentLoggedInCompany) {
            showToast('Erro: Empresa não identificada.', 'error');
            return;
        }
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:5000/api/auth/register/user',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(
                        {
                            username,
                            password,
                            companyId: currentLoggedInCompany._id
                        })
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast(data.message, 'success');
            closeQuickAddModal();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    // --- Funções de Utilitário e de Tela ---
    function showToast(message, type = 'success') {
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

    function hideAllScreens() {
        initialLoginScreen.classList.add('hidden');
        cnpjLoginScreen.classList.add('hidden');
        adminLoginScreen.classList.add('hidden');
        userLoginScreen.classList.add('hidden');
        adminDashboardScreen.classList.add('hidden');
        mainAppContent.classList.add('hidden');
        companyDetailsModal.classList.add('hidden');
        addBillModal.classList.add('hidden');
        billModal.classList.add('hidden');
        barcodeFullScreenModal.classList.add('hidden');
        quickUserAddModal.classList.add('hidden');
    }

    function showInitialLogin() {
        hideAllScreens();
        initialLoginScreen.classList.remove('hidden');
        localStorage.removeItem('authToken');
        currentLoggedInCompany = null;
        currentLoggedInUser = null;
        isAdminLoggedIn = false;
        loggedInViaAdmin = false;
    }

    function showCnpjLogin() {
        hideAllScreens();
        cnpjLoginForm.reset();
        cnpjLoginScreen.classList.remove('hidden');
    }

    function showAdminLogin() {
        hideAllScreens();
        adminLoginForm.reset();
        adminLoginScreen.classList.remove('hidden');
    }

    function showUserLogin(companyName) {
        hideAllScreens();
        userLoginForm.reset();
        welcomeUserText.textContent = `Bem-vindo à ${companyName}`;
        userLoginScreen.classList.remove('hidden');
    }

    function showMainApp() {
        hideAllScreens();
        mainAppContent.classList.remove('hidden');

        if (loggedInViaAdmin) {
            backToAdminBtn.classList.remove('hidden');
        } else {
            backToAdminBtn.classList.add('hidden');
        }
        
        // <<< LÓGICA CORRIGIDA AQUI >>>
        // Agora a engrenagem só aparece se o usuário for 'Proprietário' E se ele NÃO for o Super Admin.
        if (!isAdminLoggedIn && currentLoggedInUser && currentLoggedInUser.role === 'Proprietário') {
            settingsMenuContainer.classList.remove('hidden');
        } else {
            settingsMenuContainer.classList.add('hidden');
        }

        updateBillsOrganizer();
    }

    function showAdminDashboard() {
        hideAllScreens();
        adminDashboardScreen.classList.remove('hidden');
        renderCompanyList();
    }

    function formatCnpj(value) {
        value = value.replace(/\D/g, '');
        if (value.length > 14) value = value.slice(0, 14);
        if (value.length > 12) return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        if (value.length > 8) return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, '$1.$2.$3/$4');
        if (value.length > 5) return value.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3');
        if (value.length > 2) return value.replace(/^(\d{2})(\d{3})$/, '$1.$2');
        return value;
    }
    // --- Lógica de Navegação do Calendário ---
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
        updateMonthlySummary();
    });
    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
        updateMonthlySummary();
    });
    // --- Lógica de Autenticação e Outras Funções ---
    showCnpjLoginBtn.addEventListener('click', showCnpjLogin);
    showAdminLoginBtn.addEventListener('click', showAdminLogin);
    backToInitialLoginBtnCnpj.addEventListener('click', showInitialLogin);
    backToInitialLoginBtnAdmin.addEventListener('click', showInitialLogin);
    cnpjInput.addEventListener('input', (e) => e.target.value = formatCnpj(e.target.value));
    logoutBtn.addEventListener('click', showInitialLogin);
    adminLogoutBtn.addEventListener('click', showInitialLogin);
    backToCnpjLoginBtn.addEventListener('click', showCnpjLogin);
    cnpjLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const cnpj = cnpjInput.value;
        const password = cnpjPasswordInput.value;
        try {
            const response = await fetch('http://localhost:5000/api/auth/login/company',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(
                        {
                            cnpj,
                            password
                        }),
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao tentar fazer login.');
            localStorage.setItem('authToken', data.token);
            currentLoggedInCompany = data.company;
            loggedInViaAdmin = false;
            showUserLogin(currentLoggedInCompany.nomeEmpresa);
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    adminLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = adminUsernameInput.value;
        const password = adminPasswordInput.value;
        try {
            const response = await fetch('http://localhost:5000/api/auth/login/admin',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(
                        {
                            username,
                            password
                        })
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            localStorage.setItem('authToken', data.token);
            isAdminLoggedIn = true;
            showToast('Login de Administrador bem-sucedido!', 'success');
            showAdminDashboard();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    userLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = userInput.value;
        const password = userPasswordInput.value;
        if (!currentLoggedInCompany || !currentLoggedInCompany._id) {
            showToast('Erro: ID da empresa não encontrado. Faça o login da empresa novamente.', 'error');
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/auth/login/user',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(
                        {
                            username,
                            password,
                            companyId: currentLoggedInCompany._id
                        })
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast(data.message, 'success');
            localStorage.setItem('authToken', data.token);
            currentLoggedInUser = data.user;
            showMainApp();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    registerUserBtn.addEventListener('click', async function () {
        const username = userInput.value;
        const password = userPasswordInput.value;
        if (!username || !password) {
            showToast('Por favor, preencha o nome de usuário e a senha.', 'error');
            return;
        }
        if (!currentLoggedInCompany || !currentLoggedInCompany._id) {
            showToast('Erro: Nenhuma empresa selecionada. Faça o login da empresa novamente.', 'error');
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/auth/register/user',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(
                        {
                            username,
                            password,
                            companyId: currentLoggedInCompany._id
                        })
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast(data.message, 'success');
            userLoginForm.reset();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    backToAdminBtn.addEventListener('click', async () => {
        showToast("Retornando ao Painel de Administrador...", "info");
        try {
            const response = await fetch('http://localhost:5000/api/auth/login/admin',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(
                        {
                            username: 'Admin',
                            password: '@350239'
                        })
                });
            const data = await response.json();
            if (!response.ok) {
                showInitialLogin();
                throw new Error(data.message);
            }
            localStorage.setItem('authToken', data.token);
            currentLoggedInUser = null;
            currentLoggedInCompany = null;
            loggedInViaAdmin = false;
            isAdminLoggedIn = true;
            showAdminDashboard();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    async function renderCompanyList() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const response = await fetch('http://localhost:5000/api/companies', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Falha ao buscar empresas.');

            const companies = await response.json();
            companyListDiv.innerHTML = '';

            if (companies.length === 0) {
                noCompaniesMessage.classList.remove('hidden');
            } else {
                noCompaniesMessage.classList.add('hidden');
                companies.forEach(company => {
                    const companyCard = document.createElement('div');
                    companyCard.className = 'bg-gray-700 rounded-lg shadow-md p-6';
                    companyCard.innerHTML = `
                        <h3 class="text-xl font-bold text-white mb-2">${company.nomeEmpresa}</h3>
                        <p class="text-gray-300">CNPJ: ${formatCnpj(company.cnpj)}</p>
                        <p class="text-gray-400 text-sm mt-2">${company.usuarios.length} usuários cadastrados</p>
                        <div class="mt-4 flex justify-end space-x-2">
                            <button class="view-company-details-btn bg-indigo-600 text-white py-1 px-3 rounded-md hover:bg-indigo-700 text-sm" data-company-id="${company._id}">Detalhes</button>
                            <button class="enter-company-btn bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 text-sm" data-company-id="${company._id}">Entrar</button>
                        </div>
                    `;
                    companyListDiv.appendChild(companyCard);
                });

                document.querySelectorAll('.view-company-details-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const companyId = e.target.dataset.companyId;
                        const token = localStorage.getItem('authToken');
                        try {
                            const response = await fetch(`http://localhost:5000/api/companies/${companyId}`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                            const companyDetails = await response.json();
                            if (!response.ok) throw new Error(companyDetails.message);
                            openCompanyDetailsModal(companyDetails);
                        } catch (error) {
                            showToast(error.message, 'error');
                        }
                    });
                });

                document.querySelectorAll('.enter-company-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const companyId = e.target.dataset.companyId;
                        const token = localStorage.getItem('authToken');
                        try {
                            const companyResponse = await fetch(`http://localhost:5000/api/companies/${companyId}`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                            const companyDetails = await companyResponse.json();
                            if (!companyResponse.ok) throw new Error(companyDetails.message);
                            if (companyDetails.usuarios.length === 0) {
                                showToast("Esta empresa não tem usuários para entrar.", "info");
                                return;
                            }
                            const userId = companyDetails.usuarios[0]._id;
                            const impersonateResponse = await fetch('http://localhost:5000/api/admin/impersonate', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    companyId,
                                    userId
                                })
                            });
                            const data = await impersonateResponse.json();
                            if (!impersonateResponse.ok) throw new Error(data.message);
                            showToast(`Entrando na empresa ${data.company.nomeEmpresa}...`, 'success');
                            localStorage.setItem('authToken', data.token);
                            currentLoggedInCompany = data.company;
                            currentLoggedInUser = data.user;
                            loggedInViaAdmin = true;
                            showMainApp();
                        } catch (error) {
                            showToast(error.message, 'error');
                        }
                    });
                });
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
    createCompanyBtn.addEventListener('click', async () => {
        const nomeEmpresa = prompt("Digite o nome da nova empresa:");
        if (!nomeEmpresa) return;
        const cnpj = prompt("Digite o CNPJ da nova empresa:");
        if (!cnpj) return;
        const senhaEmpresa = prompt("Digite uma senha para a nova empresa:");
        if (!senhaEmpresa) return;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast("Erro de autenticação. Faça o login de administrador novamente.", "error");
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/companies/register',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(
                        {
                            nomeEmpresa,
                            cnpj,
                            senhaEmpresa
                        })
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Não foi possível criar a empresa.");
            showToast(data.message, 'success');
            renderCompanyList();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    // --- Lógica Principal do App de Boletos ---
    function initializeCalendarDate() {
        const today = new Date();
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        currentDailyViewDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
    async function updateBillsOrganizer() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('Sessão inválida. Por favor, faça o login.', 'error');
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/boletos',
                {
                    method: 'GET',
                    headers:
                    {
                        'Authorization': `Bearer ${token}`
                    }
                });
            if (!response.ok) throw new Error((await response.json()).message || "Erro ao buscar boletos.");
            userBoletos = await response.json();
            const totalParcels = userBoletos.reduce((acc, bill) => acc + bill.parcels.length, 0);
            totalBillsSpan.textContent = totalParcels;
            updateMonthlySummary();
            if (window.innerWidth >= 1024) {
                document.getElementById('billsOrganizer').classList.remove('hidden');
                document.getElementById('dailyBillsViewer').classList.add('hidden');
                renderCalendar();
            }
            else {
                document.getElementById('billsOrganizer').classList.add('hidden');
                document.getElementById('dailyBillsViewer').classList.remove('hidden');
                renderDailyBills();
            }
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    }

    function updateMonthlySummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parcelsThisMonth = userBoletos.flatMap(bill => bill.parcels)
            .filter(parcel => {
                const parcelDate = new Date(parcel.dueDate + 'T00:00:00');
                return parcelDate.getMonth() === currentMonth && parcelDate.getFullYear() === currentYear;
            });
        const totalMes = parcelsThisMonth.reduce((sum, parcel) => sum + parcel.amount, 0);
        const totalPago = parcelsThisMonth.filter(p => p.paid).reduce((sum, parcel) => sum + parcel.amount, 0);
        const totalNaoPago = totalMes - totalPago;
        const overdueParcels = userBoletos.flatMap(bill => bill.parcels)
            .filter(parcel => {
                const dueDate = new Date(parcel.dueDate + 'T00:00:00');
                return dueDate < today && !parcel.paid;
            });
        const totalOverdue = overdueParcels.reduce((sum, parcel) => sum + parcel.amount, 0);
        const formatCurrency = (value) => value.toLocaleString('pt-BR',
            {
                style: 'currency',
                currency: 'BRL'
            });
        document.getElementById('summaryOverdue').textContent = formatCurrency(totalOverdue);
        document.getElementById('summaryTotal').textContent = formatCurrency(totalMes);
        document.getElementById('summaryPaid').textContent = formatCurrency(totalPago);
        document.getElementById('summaryUnpaid').textContent = formatCurrency(totalNaoPago);
    }

    function renderCalendar() {
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        document.getElementById('currentMonthYear').textContent = `${monthNames[currentMonth]} de ${currentYear}`;
        const calendarDays = document.getElementById('calendarDays');
        calendarDays.innerHTML = '';
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty p-1 border border-gray-800';
            calendarDays.appendChild(emptyCell);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell p-1 border border-gray-800 relative cursor-pointer hover:bg-gray-600 transition-colors';
            dayCell.dataset.date = dateStr;
            const dayHeader = document.createElement('div');
            dayHeader.className = 'text-right font-medium text-sm mb-1 text-gray-300';
            dayHeader.textContent = day;
            dayCell.appendChild(dayHeader);
            dayCell.addEventListener('click', (e) => {
                if (e.target.closest('.bill-card')) return;
                const clickedDate = e.currentTarget.dataset.date;
                clearBillForm();
                document.getElementById('dueDate').value = clickedDate;
                addBillModal.classList.remove('hidden');
            });
            userBoletos.forEach(bill => {
                bill.parcels.filter(p => p.dueDate === dateStr).forEach(parcel => {
                    const parcelElement = document.createElement('div');
                    parcelElement.className = `bill-card text-xs p-1 mb-1 rounded cursor-pointer ${parcel.paid ? 'bg-green-700 text-green-100 hover:bg-green-600' : 'bg-indigo-700 text-indigo-100 hover:bg-indigo-600'}`;
                    parcelElement.innerHTML = `<div class="font-medium truncate">${bill.name} - ${parcel.number}ª</div><div>${parcel.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>`;
                    parcelElement.addEventListener('click', () => openBillModal(bill, parcel));
                    dayCell.appendChild(parcelElement);
                });
            });
            calendarDays.appendChild(dayCell);
        }
    }

    function renderDailyBills() {
        dailyBillsList.innerHTML = '<div class="text-center text-gray-500 p-4">Funcionalidade de lista diária a ser implementada.</div>';
    }

    function clearBillForm() {
        billForm.reset();
        installmentsPreview.classList.add('hidden');
        installmentsList.innerHTML = '';
        currentBill = {};
    }
    clearFormBtn.addEventListener('click', clearBillForm);
    billForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const billName = document.getElementById('billName').value;
        const dueDate = document.getElementById('dueDate').value;
        const totalAmount = parseFloat(document.getElementById('totalAmount').value);
        const installments = parseInt(document.getElementById('installments').value);
        const description = document.getElementById('description').value;
        const spacingDays = parseInt(document.getElementById('spacingDays').value) || 30;
        const barcode = document.getElementById('barcode').value;
        if (!billName || !dueDate || !totalAmount || !installments) {
            showToast("Preencha todos os campos obrigatórios.", "error");
            return;
        }
        currentBill = {
            name: billName,
            parcels: []
        };
        const parcelAmount = parseFloat((totalAmount / installments).toFixed(2));
        installmentsList.innerHTML = '';
    for (let i = 0; i < installments; i++) {
        const parcelDate = new Date(dueDate + 'T00:00:00');
        parcelDate.setDate(parcelDate.getDate() + (i * spacingDays));
        const dateForInput = parcelDate.toISOString().split('T')[0];

        currentBill.parcels.push({
            id: `${Date.now()}-${i}`,
            number: i + 1,
            amount: parcelAmount,
            dueDate: dateForInput,
            paid: false,
            description: description,
            barcode: barcode
        });

        const formattedDate = parcelDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const parcelItem = document.createElement('div');
        parcelItem.className = 'bill-card bg-gray-700 rounded-md p-3 border border-gray-600 flex justify-between items-center';
        
        parcelItem.innerHTML = `
            <div class="flex items-center space-x-4">
                <span class="font-medium text-gray-200 w-20">Parcela ${i + 1}</span>
                <input type="date" class="parcel-date-input bg-gray-600 text-white p-2 rounded text-sm" value="${dateForInput}" data-parcel-index="${i}">
            </div>
            <input type="number" step="0.01" class="parcel-amount-input bg-gray-600 text-white p-2 rounded w-32 text-right font-bold text-lg" value="${parcelAmount.toFixed(2)}" data-parcel-index="${i}">
        `;
        
        installmentsList.appendChild(parcelItem);
    }
        document.querySelectorAll('.parcel-amount-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.parcelIndex);
                const newAmount = parseFloat(e.target.value) || 0;
                if (!isNaN(newAmount)) {
                    currentBill.parcels[index].amount = newAmount;
                    updatePreviewTotal();
                }
            });
            input.addEventListener('blur', (e) => {
                const newAmount = parseFloat(e.target.value) || 0;
                e.target.value = newAmount.toFixed(2);
            });
        });
        document.querySelectorAll('.parcel-date-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.parcelIndex);
                currentBill.parcels[index].dueDate = e.target.value;
            });
        });
        installmentsPreview.classList.remove('hidden');
        updatePreviewTotal();
    });

    function updatePreviewTotal() {
        if (!currentBill.parcels || currentBill.parcels.length === 0) return;
        const total = currentBill.parcels.reduce((sum, parcel) => sum + parcel.amount, 0);
        parcelPreviewTotalSpan.textContent = `Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    }
    addToOrganizer.addEventListener('click', async function () {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('Erro de autenticação. Por favor, faça o login novamente.', 'error');
            return;
        }
        if (!currentBill || !currentBill.name) {
            showToast('Calcule as parcelas antes de adicionar.', 'error');
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/boletos',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(currentBill)
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erro ao salvar boleto.");
            showToast(data.message, 'success');
            addBillModal.classList.add('hidden');
            updateBillsOrganizer();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    // --- Lógica do Modal de Edição de Boletos ---
    function openBillModal(bill, parcel) {
        selectedParcel = {
            ...parcel,
            parentId: bill.id
        };
        document.getElementById('modalBillName').textContent = `${bill.name} (Parcela ${parcel.number})`;
        document.getElementById('modalBillAmount').value = parcel.amount.toFixed(2);
        document.getElementById('modalBillDate').value = parcel.dueDate;
        document.getElementById('modalBillDescription').value = parcel.description || '';
        modalBillBarcodeInput.value = parcel.barcode || '';
        modalBillPaidCheckbox.checked = parcel.paid;
        if (parcel.barcode && parcel.barcode.trim() !== '') {
            showFullScreenBarcodeBtn.classList.remove('hidden');
        }
        else {
            showFullScreenBarcodeBtn.classList.add('hidden');
        }
        billModal.classList.remove('hidden');
    }
    closeModalBtn.addEventListener('click', () => billModal.classList.add('hidden'));
    billModal.addEventListener('click', (e) => {
        if (e.target === billModal) billModal.classList.add('hidden');
    });
    saveBillBtn.addEventListener('click', async () => {
        if (!selectedParcel) return;
        const token = localStorage.getItem('authToken');
        const updatedData = {
            paid: document.getElementById('modalBillPaid').checked,
            amount: parseFloat(document.getElementById('modalBillAmount').value),
            dueDate: document.getElementById('modalBillDate').value,
            description: document.getElementById('modalBillDescription').value,
            barcode: document.getElementById('modalBillBarcode').value
        };
        try {
            const response = await fetch(`http://localhost:5000/api/boletos/${selectedParcel.parentId}/parcels/${selectedParcel.id}`,
                {
                    method: 'PATCH',
                    headers:
                    {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedData)
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast('Parcela atualizada com sucesso!', 'success');
            billModal.classList.add('hidden');
            updateBillsOrganizer();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    deleteBillBtn.addEventListener('click', async () => {
        if (!selectedParcel) return;
        if (!confirm("Tem certeza que deseja excluir APENAS esta parcela?")) return;
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`http://localhost:5000/api/boletos/${selectedParcel.parentId}/parcels/${selectedParcel.id}`,
                {
                    method: 'DELETE',
                    headers:
                    {
                        'Authorization': `Bearer ${token}`
                    }
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast('Parcela excluída com sucesso!', 'success');
            billModal.classList.add('hidden');
            updateBillsOrganizer();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
deleteEntireBillBtn.addEventListener('click', async () => {
    if (!selectedParcel || !selectedParcel.parentId) {
        showToast("Nenhum boleto selecionado.", "error");
        return;
    }
    
    if (!confirm("Tem certeza que deseja excluir o boleto INTEIRO e TODAS as suas parcelas? Esta ação não pode ser desfeita.")) {
        return;
    }
    
    const token = localStorage.getItem('authToken');
    const boletoId = selectedParcel.parentId;
    
    try {
        const response = await fetch(`http://localhost:5000/api/boletos/${boletoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message);
        }
        
        showToast('Boleto completo excluído com sucesso!', 'success');
        billModal.classList.add('hidden');
        updateBillsOrganizer();
        
    } catch (error) {
        showToast(error.message, 'error');
    }
});

async function fetchCompanyDetailsAndOpenModal(companyId) {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`http://localhost:5000/api/companies/${companyId}`,
            {
                headers:
                {
                    'Authorization': `Bearer ${token}`
                }
            });
        const companyDetails = await response.json();
        if (!response.ok) throw new Error(companyDetails.message);
        openCompanyDetailsModal(companyDetails);
    }
    catch (error) {
        showToast(error.message, 'error');
    }
}

    // --- Lógica do Modal de Detalhes da Empresa ---
function openCompanyDetailsModal(company) {
    selectedCompanyForAdmin = company;
    modalCompanyName.textContent = company.nomeEmpresa;
    modalCompanyCnpj.textContent = formatCnpj(company.cnpj);
    modalCompanyPasswordInput.value = '';

    modalCompanyUsers.innerHTML = '';
    if (company.usuarios.length === 0) {
        modalCompanyUsers.innerHTML = '<p class="text-gray-400">Nenhum usuário cadastrado.</p>';
    } else {
        // Define a lista de papéis disponíveis baseado em quem está logado
        const assignableRoles = isAdminLoggedIn ?
            ['Proprietário', 'Gerente', 'Funcionário'] :
            ['Gerente', 'Funcionário'];

        company.usuarios.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'bg-gray-700 rounded p-2 flex justify-between items-center mb-2';

            let roleDisplay = '';

            // Se o Super Admin estiver logado, TODOS os usuários são editáveis.
            const isEditable = isAdminLoggedIn || user.role !== 'Proprietário';

            if (isEditable) {
                const optionsHTML = assignableRoles.map(role => {
                    // Impede que um Proprietário crie outro Proprietário no dropdown
                    if (!isAdminLoggedIn && role === 'Proprietário') {
                        return '';
                    }
                    return `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role}</option>`;
                }).join('');

                let finalOptions = optionsHTML;
                // Garante que a opção 'Proprietário' apareça para um usuário que já é proprietário
                if (isAdminLoggedIn && user.role === 'Proprietário' && !assignableRoles.includes('Proprietário')) {
                    finalOptions = `<option value="Proprietário" selected>Proprietário</option>` + optionsHTML;
                }

                roleDisplay = `<select class="role-select bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm" data-user-id="${user._id}">${finalOptions}</select>`;
            } else {
                // Mostra um texto fixo para o Proprietário quando não é o Super Admin que está vendo.
                roleDisplay = `<span class="bg-yellow-500 text-yellow-900 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">Proprietário</span>`;
            }

            userItem.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="text-white">${user.username}</span>
                    ${roleDisplay}
                </div>
                <button class="remove-user-btn bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-700" data-user-id="${user._id}">Remover</button>
            `;
            modalCompanyUsers.appendChild(userItem);
        });
    }



    // Anexa os listeners aos botões e selects criados
    document.querySelectorAll('.remove-user-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.dataset.userId;
            const companyId = selectedCompanyForAdmin._id;
            handleRemoveUser(companyId, userId);
        });
    });

    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const userId = e.target.dataset.userId;
            const newRole = e.target.value;
            const token = localStorage.getItem('authToken');
            const companyId = selectedCompanyForAdmin._id;

            try {
                const response = await fetch(`http://localhost:5000/api/companies/${companyId}/users/${userId}/role`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        role: newRole
                    })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message);
                }

                showToast(data.message, 'success');
                // Atualiza o estado local para refletir a mudança sem precisar recarregar
                const userToUpdate = selectedCompanyForAdmin.usuarios.find(u => u._id === userId);
                if(userToUpdate) {
                    userToUpdate.role = newRole;
                }
                
            } catch (error) {
                showToast(error.message, 'error');
                // Em caso de erro, recarrega o modal para reverter a mudança visual na tela
                fetchCompanyDetailsAndOpenModal(companyId);
            }
        });
    });

    companyDetailsModal.classList.remove('hidden');
}
    async function handleRemoveUser(companyId, userId) {
        if (!confirm("Tem certeza que deseja remover este usuário?")) return;
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`http://localhost:5000/api/companies/${companyId}/users/${userId}`,
                {
                    method: 'DELETE',
                    headers:
                    {
                        'Authorization': `Bearer ${token}`
                    }
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast(data.message, 'success');
            companyDetailsModal.classList.add('hidden');
            renderCompanyList();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    }
    addUserBtn.addEventListener('click', async () => {
        if (!selectedCompanyForAdmin) return;
        const username = prompt("Digite o nome do novo usuário:");
        if (!username) return;
        const password = prompt(`Digite a senha para o usuário "${username}":`);
        if (!password) return;
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch('http://localhost:5000/api/auth/register/user',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(
                        {
                            username,
                            password,
                            companyId: selectedCompanyForAdmin._id
                        })
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast(data.message, 'success');
            companyDetailsModal.classList.add('hidden');
            renderCompanyList();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    deleteCompanyBtn.addEventListener('click', async () => {
        if (!selectedCompanyForAdmin) return;
        const confirmation = prompt(`Atenção! Esta ação é irreversível. Para confirmar a exclusão, digite o nome da empresa: "${selectedCompanyForAdmin.nomeEmpresa}"`);
        if (confirmation !== selectedCompanyForAdmin.nomeEmpresa) {
            showToast("A exclusão foi cancelada.", "info");
            return;
        }
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`http://localhost:5000/api/companies/${selectedCompanyForAdmin._id}`,
                {
                    method: 'DELETE',
                    headers:
                    {
                        'Authorization': `Bearer ${token}`
                    }
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast(data.message, 'success');
            companyDetailsModal.classList.add('hidden');
            renderCompanyList();
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    saveCompanyDetailsBtn.addEventListener('click', async () => {
        if (!selectedCompanyForAdmin) return;
        const newPassword = modalCompanyPasswordInput.value;
        if (!newPassword) {
            showToast("Digite uma nova senha para alterar.", "info");
            return;
        }
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`http://localhost:5000/api/companies/${selectedCompanyForAdmin._id}`,
                {
                    method: 'PATCH',
                    headers:
                    {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(
                        {
                            newPassword: newPassword
                        })
                });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            showToast('Dados da empresa atualizados com sucesso!', 'success');
            companyDetailsModal.classList.add('hidden');
        }
        catch (error) {
            showToast(error.message, 'error');
        }
    });
    closeCompanyModalBtn.addEventListener('click', () => companyDetailsModal.classList.add('hidden'));
    companyDetailsModal.addEventListener('click', (e) => {
        if (e.target === companyDetailsModal) companyDetailsModal.classList.add('hidden');
    });
    // --- Inicialização ---
    initializeCalendarDate();
    showInitialLogin();
});