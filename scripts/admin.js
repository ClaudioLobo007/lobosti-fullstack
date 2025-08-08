// D:\SCripts\SiteLobos\Scripts\admin.js
import * as api from './api.js';
import { showToast, showLoader, hideLoader, formatCnpj, hideAllScreens } from './utils.js'


// Variáveis de estado e elementos do DOM para o painel de admin
let selectedCompanyForAdmin = null;
let isRenderingAnnouncements = false;
let adminImpersonationCallback = null;
let newCompaniesChart = null;
let allSubscriptionsData = [];
let currentEditingTemplateId = null;

const viewSettingsTab = document.getElementById('viewSettingsTab');
const settingsView = document.getElementById('settingsView');

const viewSubscriptionsTab = document.getElementById('viewSubscriptionsTab');
const subscriptionsView = document.getElementById('subscriptionsView');

const viewDashboardTab = document.getElementById('viewDashboardTab');
const adminDashboardView = document.getElementById('adminDashboardView');

const adminDashboardScreen = document.getElementById('adminDashboardScreen');
const companyListDiv = document.getElementById('companyList');
const noCompaniesMessage = document.getElementById('noCompaniesMessage');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const createCompanyBtn = document.getElementById('createCompanyBtn');

// Elementos das novas abas
const viewCompaniesTab = document.getElementById('viewCompaniesTab');
const viewAnnouncementsTab = document.getElementById('viewAnnouncementsTab');
const companiesView = document.getElementById('companiesView');
const announcementsView = document.getElementById('announcementsView');
const adminTabButtons = document.querySelectorAll('.admin-tab-btn');

const saveCompanyDetailsBtn = document.getElementById('saveCompanyDetailsBtn');
const deleteCompanyBtn = document.getElementById('deleteCompanyBtn');
const addSubscriptionBtn = document.getElementById('addSubscriptionBtn');
const removeSubscriptionBtn = document.getElementById('removeSubscriptionBtn');
const closeCompanyModal = document.getElementById('closeCompanyModal');
const companyDetailsModal = document.getElementById('companyDetailsModal');
const addUserBtn = document.getElementById('addUserBtn');
const addUserForm = document.getElementById('addUserForm');
const closeAddUserModalBtn = document.getElementById('closeAddUserModal');
const cancelAddUserBtn = document.getElementById('cancelAddUserBtn');
const addCompanyForm = document.getElementById('addCompanyForm');
const closeAddCompanyModalBtn = document.getElementById('closeAddCompanyModal');
const cancelAddCompanyBtn = document.getElementById('cancelAddCompanyBtn');
const backToAdminBtn = document.getElementById('backToAdminBtn');

const openAnnouncementModalBtn = document.getElementById('openAnnouncementModalBtn');
const announcementModal = document.getElementById('announcementModal');
const announcementForm = document.getElementById('announcementForm');
const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');
const announcementsList = document.getElementById('announcementsList');

function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Alterna a visualização entre as abas do painel de admin.
 * @param {string} viewToShow - O nome da aba para mostrar ('companies' ou 'announcements').
 */
export function switchAdminView(viewToShow) {
    // --- A CORREÇÃO ESTÁ AQUI ---
    // Este bloco no início da função é crucial. Ele garante que TODAS as
    // vistas são escondidas antes de qualquer outra ação.
    adminDashboardView.classList.add('hidden');
    companiesView.classList.add('hidden');
    subscriptionsView.classList.add('hidden'); // Esta linha era a que provavelmente faltava
    announcementsView.classList.add('hidden');
    settingsView.classList.add('hidden');

    // Reseta o estilo de todos os botões das abas
    // (O seu código para resetar os botões continua aqui)
    adminTabButtons.forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('text-gray-400', 'hover:bg-gray-800');
    });

    // Agora, ativamos apenas a aba e a vista corretas
    if (viewToShow === 'dashboard') {
        adminDashboardView.classList.remove('hidden');
        viewDashboardTab.classList.add('bg-indigo-600', 'text-white');
        viewDashboardTab.classList.remove('text-gray-400', 'hover:bg-gray-800');
        renderAdminDashboard();
    } else if (viewToShow === 'companies') {
        companiesView.classList.remove('hidden');
        viewCompaniesTab.classList.add('bg-indigo-600', 'text-white');
        viewCompaniesTab.classList.remove('text-gray-400', 'hover:bg-gray-800');
    renderCompaniesView(); // Altere esta linha
    } else if (viewToShow === 'subscriptions') {
        subscriptionsView.classList.remove('hidden');
        viewSubscriptionsTab.classList.add('bg-indigo-600', 'text-white');
        viewSubscriptionsTab.classList.remove('text-gray-400', 'hover:bg-gray-800');
        renderSubscriptionsView();
    } else if (viewToShow === 'announcements') {
        announcementsView.classList.remove('hidden');
        viewAnnouncementsTab.classList.add('bg-indigo-600', 'text-white');
        viewAnnouncementsTab.classList.remove('text-gray-400', 'hover:bg-gray-800');
        renderAnnouncements();
    }else if (viewToShow === 'settings') {
        settingsView.classList.remove('hidden');
        viewSettingsTab.classList.add('bg-indigo-600', 'text-white');
        viewSettingsTab.classList.remove('text-gray-400', 'hover:bg-gray-800');
        renderSettingsView();
    }
}

/**
 * Função principal que inicializa o painel de admin,
 * renderiza a lista de empresas e configura os eventos.
 */
export async function showAdminDashboard(impersonationCallback) {
    adminImpersonationCallback = impersonationCallback;

    // --- NOVA ABORDAGEM DIRETA ---
    const adminPanel = document.getElementById('adminDashboardScreen');
    const mainPanel = document.getElementById('mainAppContent');
    const openAddBillModalBtn = document.getElementById('openAddBillModalBtn');

    // Escondemos explicitamente a aplicação principal e o seu botão flutuante
    if (mainPanel) {
        mainPanel.style.display = 'none';
    }
    if (openAddBillModalBtn) {
        openAddBillModalBtn.style.display = 'none';
    }

    // E mostramos explicitamente o painel de admin usando 'flex' (devido ao nosso layout de CSS)
    if (adminPanel) {
        adminPanel.style.display = 'flex';
    }
    // --- FIM DA NOVA ABORDAGEM ---

    switchAdminView('dashboard');
}

async function renderCompaniesView() {
    // 1. Desenha a estrutura completa da aba, incluindo a barra de pesquisa e a área para a lista de empresas.
    companiesView.innerHTML = `
        <div class="mb-8">
            <input type="text" id="globalSearchInput" placeholder="Pesquisar por Utilizador, E-mail, Empresa ou CNPJ..." class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500">
            <div id="searchResultsContainer" class="mt-4"></div>
        </div>
        
        <hr class="border-gray-700 mb-8">

        <div class="mb-6 flex justify-center space-x-4">
            <button id="createCompanyBtn" class="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-200 flex items-center">
                <i class="fas fa-plus-circle mr-2"></i> Criar Nova Empresa
            </button>
        </div>
        <div id="companyList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        <div id="noCompaniesMessage" class="col-span-full text-center text-gray-400 py-8 hidden">
            Nenhuma empresa cadastrada ainda.
        </div>
    `;

    // 2. Configura os 'event listeners' para os elementos que acabaram de ser criados.
    const createCompanyBtn = document.getElementById('createCompanyBtn');
    if (createCompanyBtn) {
        createCompanyBtn.addEventListener('click', openAddCompanyModal);
    }

    const searchInput = document.getElementById('globalSearchInput');
    const debouncedSearch = debounce(async (event) => {
        const query = event.target.value;
        const resultsContainer = document.getElementById('searchResultsContainer');
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        try {
            const results = await api.globalAdminSearch(query);
            renderSearchResults(results);
        } catch (error) {
            showToast('Erro ao realizar pesquisa.', 'error');
        }
    });
    searchInput.addEventListener('input', debouncedSearch);

    // 3. Carrega a lista principal de todas as empresas.
    const companyListDiv = document.getElementById('companyList');
    const noCompaniesMessage = document.getElementById('noCompaniesMessage');
    
    showLoader();
    try {
        const companies = await api.getCompanies();
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
                    <div class="mt-4 flex justify-end space-x-2">
                        <button class="view-details-btn bg-indigo-600 text-white py-1 px-3 rounded-md hover:bg-indigo-700 text-sm" data-company-id="${company._id}">Detalhes</button>
                        <button class="enter-company-btn bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 text-sm" data-company-id="${company._id}">Entrar</button>
                    </div>
                `;
                companyListDiv.appendChild(companyCard);
            });
            // Ativa os botões 'Detalhes' e 'Entrar' dos cartões que acabaram de ser criados.
            addEventListenersToAdminButtons();
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

function addEventListenersToAdminButtons() {
    // Listener para os botões "Detalhes"
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const companyId = e.target.dataset.companyId;
            showLoader();
            try {
                const { company, users, masterUsers } = await api.getCompanyDetails(companyId);
                openCompanyDetailsModal(company, users, masterUsers);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                hideLoader();
            }
        });
    });

    // Listener para os botões "Entrar"
    document.querySelectorAll('.enter-company-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const companyId = e.target.dataset.companyId;
            showLoader();

            try {
                const { masterUsers } = await api.getCompanyDetails(companyId);

                if (!masterUsers || masterUsers.length === 0) {
                    hideLoader();
                    return showToast('Esta empresa não possui usuários para representar.', 'info');
                }

                let userToImpersonate = masterUsers.find(user => user.role === 'Proprietário');

                if (!userToImpersonate) {
                    console.warn(`Nenhum 'Proprietário' encontrado para a empresa ${companyId}. A representar o primeiro utilizador da lista.`);
                    userToImpersonate = masterUsers[0];
                }

                if (!userToImpersonate) {
                    hideLoader();
                    return showToast('Não foi encontrado um utilizador para representar.', 'error');
                }
                
                const userIdToImpersonate = userToImpersonate._id;
                const data = await api.impersonateUser(companyId, userIdToImpersonate);

                // Utiliza a variável do módulo que guardamos no início
                if (typeof adminImpersonationCallback === 'function') {
                    adminImpersonationCallback(data);
                } else {
                    console.error("A função de callback para representação não foi fornecida ao painel de admin.");
                    hideLoader();
                }

            } catch (error) {
                showToast(error.message, 'error');
                hideLoader();
            }
        });
    });
}

/**
 * Função auxiliar para atualizar os detalhes da assinatura no modal.
 * @param {object} subscription - O objeto de assinatura da empresa.
 */
function updateSubscriptionDetails(subscription) {
    const statusEl = document.getElementById('subscriptionStatus');
    const endDateEl = document.getElementById('subscriptionEndDate');
    const adminSubscriptionManagement = document.getElementById('adminSubscriptionManagement');
    const today = new Date();

    if (!statusEl || !endDateEl || !adminSubscriptionManagement) return;

    adminSubscriptionManagement.classList.remove('hidden');
    let currentStatus = subscription?.status || 'inactive';
    
    // Calcula o status 'expirada' em tempo real para o modal
    if (currentStatus === 'active' && subscription.endDate && new Date(subscription.endDate) < today) {
        currentStatus = 'expired';
    }

    statusEl.innerHTML = getStatusBadge(currentStatus);
    endDateEl.textContent = subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('pt-BR') : 'N/A';
}

/**
 * Abre e preenche o modal com os detalhes de uma empresa específica.
 * @param {object} company - O objeto da empresa.
 * @param {Array} users - A lista de utilizadores do tenant (mantida por consistência).
 * @param {Array} masterUsers - A lista de utilizadores do banco de dados mestre.
 */
function openCompanyDetailsModal(company, users, masterUsers) {
    // 1. Guarda a referência da empresa selecionada para uso nos handlers
    selectedCompanyForAdmin = company;

    // 2. Referências aos elementos do Modal
    const companyDetailsModal = document.getElementById('companyDetailsModal');
    const modalCompanyNameInput = document.getElementById('modalCompanyNameInput');
    const modalCompanyCnpj = document.getElementById('modalCompanyCnpj');
    const modalCompanyPasswordInput = document.getElementById('modalCompanyPasswordInput');
    const modalCompanyUsers = document.getElementById('modalCompanyUsers');
    
    // 3. Preenche os dados básicos da empresa e da assinatura
    modalCompanyNameInput.value = company.nomeEmpresa;
    modalCompanyCnpj.textContent = formatCnpj(company.cnpj);
    modalCompanyPasswordInput.value = ''; // Limpa o campo de senha por segurança
    updateSubscriptionDetails(company.subscription);

    // 4. Preenche a lista de utilizadores
    modalCompanyUsers.innerHTML = ''; // Limpa a lista anterior
    if (masterUsers && masterUsers.length > 0) {
        const roles = ['Proprietário', 'Gerente', 'Funcionário'];
        masterUsers.forEach(user => {
            const roleOptions = roles.map(role => `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role}</option>`).join('');
            const userHtml = `
                <div class="bg-gray-800 p-3 rounded-md flex justify-between items-center mb-2">
                    <div>
                        <p class="font-semibold text-white">${user.username}</p>
                        <p class="text-xs text-gray-400">${user.email || 'Sem e-mail'}</p>
                    </div>
                    <div class="flex items-center space-x-4">
                        <select class="role-select bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white" data-user-id="${user._id}">
                            ${roleOptions}
                        </select>
                        <button class="remove-user-btn text-red-400 hover:text-red-300" data-user-id="${user._id}" title="Remover Utilizador">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`;
            modalCompanyUsers.insertAdjacentHTML('beforeend', userHtml);
        });
    } else {
        modalCompanyUsers.innerHTML = '<p class="text-gray-400 text-center">Nenhum utilizador encontrado para esta empresa.</p>';
    }

    // 5. Configura os eventos para os elementos da lista de utilizadores
    modalCompanyUsers.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const userId = e.target.dataset.userId;
            const newRole = e.target.value;
            if (confirm(`Tem a certeza de que deseja alterar o cargo deste utilizador para ${newRole}?`)) {
                showLoader();
                try {
                    await api.updateUserRole(company._id, userId, newRole);
                    showToast('Cargo atualizado com sucesso!');
                    const data = await api.getCompanyDetails(company._id); // Recarrega os dados
                    openCompanyDetailsModal(data.company, data.users, data.masterUsers); // Reabre o modal com dados frescos
                } catch (error) { 
                    showToast(error.message, 'error');
                    const data = await api.getCompanyDetails(company._id);
                    openCompanyDetailsModal(data.company, data.users, data.masterUsers);
                } finally { 
                    hideLoader(); 
                }
            } else {
                const data = await api.getCompanyDetails(company._id);
                openCompanyDetailsModal(data.company, data.users, data.masterUsers);
            }
        });
    });

    modalCompanyUsers.querySelectorAll('.remove-user-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.currentTarget.dataset.userId;
            if (confirm('Tem a certeza de que deseja remover este utilizador? A ação não pode ser desfeita.')) {
                showLoader();
                try {
                    await api.deleteUserFromCompany(company._id, userId);
                    showToast('Utilizador removido com sucesso!');
                    const data = await api.getCompanyDetails(company._id);
                    openCompanyDetailsModal(data.company, data.users, data.masterUsers);
                } catch (error) { showToast(error.message, 'error'); } finally { hideLoader(); }
            }
        });
    });

    // 6. Define as funções de handler para os botões principais do modal
    const handleSaveDetails = async () => {
        // Lógica para salvar alterações do nome da empresa, etc.
        showToast('Funcionalidade "Salvar Alterações" ainda não implementada.', 'info');
    };

    const handleDelete = async () => {
        if (!company) return;
        const confirmation = prompt(`Esta ação é irreversível. Para confirmar a exclusão, digite o nome da empresa: "${company.nomeEmpresa}"`);
        if (confirmation !== company.nomeEmpresa) {
            return showToast("A digitação não corresponde. A exclusão foi cancelada.", "info");
        }
        showLoader();
        try {
            await api.deleteCompany(company._id);
            showToast('Empresa e todos os seus dados foram excluídos com sucesso!');
            companyDetailsModal.classList.add('hidden');
            renderCompaniesView();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    };
    
    const handleAddUser = () => openAddUserModal(company._id, true);
    
    const handleAddSubscription = async () => {
        const days = document.getElementById('daysToAddInput').value;
        if (!days || parseInt(days) <= 0) return showToast('Por favor, insira um número de dias válido.', 'error');
        showLoader();
        try {
            const updatedData = await api.addSubscription(company._id, days);
            showToast('Assinatura adicionada com sucesso!', 'success');
            updateSubscriptionDetails(updatedData.company.subscription);
            
            const subsView = document.getElementById('subscriptionsView');
            if (subsView && !subsView.classList.contains('hidden')) {
                fetchAndRenderSubscriptions();
            }
        } catch (error) { showToast(error.message, 'error'); } finally { hideLoader(); }
    };

    const handleRemoveSubscription = async () => {
        if (!confirm(`Tem a certeza que deseja remover a assinatura da empresa ${company.nomeEmpresa}?`)) return;
        showLoader();
        try {
            const updatedData = await api.removeSubscription(company._id);
            showToast('Assinatura removida com sucesso!', 'success');
            updateSubscriptionDetails(updatedData.company.subscription);
            
            const subsView = document.getElementById('subscriptionsView');
            if (subsView && !subsView.classList.contains('hidden')) {
                fetchAndRenderSubscriptions();
            }
        } catch (error) { showToast(error.message, 'error'); } finally { hideLoader(); }
    };

    // 7. Limpa listeners antigos e adiciona os novos para evitar bugs de múltiplos cliques
    const cleanAndSetListener = (btn, handler) => {
        if (!btn) return;
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', handler);
    };

    cleanAndSetListener(document.getElementById('saveCompanyDetailsBtn'), handleSaveDetails);
    cleanAndSetListener(document.getElementById('deleteCompanyBtn'), handleDelete);
    cleanAndSetListener(document.getElementById('addUserBtn'), handleAddUser);
    cleanAndSetListener(document.getElementById('addSubscriptionBtn'), handleAddSubscription);
    cleanAndSetListener(document.getElementById('removeSubscriptionBtn'), handleRemoveSubscription);
    cleanAndSetListener(document.getElementById('closeCompanyModal'), () => companyDetailsModal.classList.add('hidden'));

    // 8. Mostra o modal
    companyDetailsModal.classList.remove('hidden');
}

function openAddCompanyModal() {
    if (addCompanyForm) addCompanyForm.reset();
    if (addCompanyModal) addCompanyModal.classList.remove('hidden');
    document.getElementById('addCompanyNameInput').focus();
}

function closeAddCompanyModal() {
    if (addCompanyModal) addCompanyModal.classList.add('hidden');
}

export function openAddUserModal(companyId, isAdmin = false) {
    const addUserForm = document.getElementById('addUserForm');
    const addUserModal = document.getElementById('addUserModal');
    const addUserRoleSelect = document.getElementById('addUserRoleSelect');

    let availableRoles;
    if (isAdmin) {
        availableRoles = ['Proprietário', 'Gerente', 'Funcionário'];
    } else {
        availableRoles = ['Gerente', 'Funcionário'];
    }

    addUserRoleSelect.innerHTML = '';
    availableRoles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        addUserRoleSelect.appendChild(option);
    });

    if (addUserForm) {
        addUserForm.reset();
        addUserForm.dataset.companyId = companyId;
        addUserForm.dataset.isAdmin = isAdmin; // <<--- LINHA ADICIONADA: Guardamos o status aqui
    }

    if (addUserModal) {
        addUserModal.classList.remove('hidden');
    }
    document.getElementById('addUsernameInput').focus();
}

function closeAddUserModal() {
    if (addUserModal) addUserModal.classList.add('hidden');
}

/**
 * Abre e preenche o modal de gestão de utilizadores para uma empresa específica.
 * Busca os dados mais recentes da API e configura os eventos de interação.
 * @param {object} company - O objeto da empresa cujos utilizadores serão geridos.
 */
export async function openManageUsersModal(company) {
    // Validação inicial para garantir que recebemos a empresa correta
    if (!company || !company._id) {
        showToast('Erro: Não foi possível identificar a empresa para gerir os utilizadores.', 'error');
        return;
    }

    showLoader();
    const manageUsersModal = document.getElementById('manageUsersModal');
    const companyUsersList = document.getElementById('companyUsersList');

    try {
        // 1. Busca sempre os dados mais recentes da API
        const { masterUsers } = await api.getCompanyDetails(company._id);

        // 2. Limpa a lista de utilizadores anterior
        if (companyUsersList) {
            companyUsersList.innerHTML = '';
        } else {
            console.error("Elemento 'companyUsersList' não foi encontrado no HTML.");
            hideLoader();
            return; // Interrompe a função se o elemento não existir
        }

        // 3. Constrói o HTML da nova lista de utilizadores
        if (masterUsers && masterUsers.length > 0) {
            const assignableRoles = ['Gerente', 'Funcionário'];

            masterUsers.forEach(user => {
                const isOwner = user.role === 'Proprietário';

                // Cria as opções do dropdown de cargos
                const roleOptions = assignableRoles.map(role =>
                    `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role}</option>`
                ).join('');

                // Se for proprietário, mostra texto; senão, mostra o dropdown.
                const roleHtml = isOwner
                    ? `<p class="text-sm text-gray-400 font-semibold">Proprietário</p>`
                    : `<select class="role-select-owner-view bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white" data-user-id="${user._id}">${roleOptions}</select>`;

                // Se não for proprietário, mostra o botão de remover.
                const buttonHtml = isOwner
                    ? ''
                    : `<button class="remove-user-btn-owner-view bg-red-600 px-3 py-1 rounded text-xs hover:bg-red-700" data-user-id="${user._id}">Remover</button>`;

                const userRowHtml = `
                    <div class="bg-gray-700 rounded p-3 flex justify-between items-center">
                        <p class="font-semibold text-white">${user.username}</p>
                        <div class="flex items-center space-x-2">
                            ${roleHtml}
                            ${buttonHtml}
                        </div>
                    </div>
                `;
                companyUsersList.insertAdjacentHTML('beforeend', userRowHtml);
            });
        } else {
            companyUsersList.innerHTML = '<p class="text-gray-400 text-center">Nenhum usuário cadastrado para esta empresa.</p>';
        }

        // 4. Adiciona os eventos aos novos elementos criados dinamicamente

        // Evento para a mudança de cargo (role)
        companyUsersList.querySelectorAll('.role-select-owner-view').forEach(select => {
            select.addEventListener('change', async (e) => {
                const userId = e.target.dataset.userId;
                const newRole = e.target.value;

                if (!confirm(`Tem a certeza de que deseja alterar o cargo deste utilizador para ${newRole}?`)) {
                    await openManageUsersModal(company); // Recarrega o modal para reverter a mudança visual
                    return;
                }

                showLoader();
                try {
                    await api.updateUserRole(company._id, userId, newRole);
                    showToast('Cargo do utilizador atualizado com sucesso!');
                } catch (error) {
                    showToast(error.message, 'error');
                } finally {
                    // Recarrega o modal para garantir que a interface está 100% sincronizada
                    await openManageUsersModal(company);
                }
            });
        });

        // Evento para o botão de remover utilizador
        companyUsersList.querySelectorAll('.remove-user-btn-owner-view').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.currentTarget.dataset.userId;

                if (!confirm('Tem a certeza de que deseja remover este utilizador?')) {
                    return;
                }

                showLoader();
                try {
                    await api.deleteUserFromCompany(company._id, userId);
                    showToast('Utilizador removido com sucesso!');
                } catch (error) {
                    showToast(error.message, 'error');
                } finally {
                    // Recarrega sempre o modal para mostrar a lista atualizada
                    await openManageUsersModal(company);
                }
            });
        });

        // 5. Mostra o modal
        if (manageUsersModal) {
            manageUsersModal.classList.remove('hidden');
        }

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Busca os dados da API e preenche o dashboard do admin.
 */
async function renderAdminDashboard() {
    showLoader();
    try {
        const stats = await api.getAdminDashboardStats();

        // Preenche os cartões (KPIs) - inalterado
        document.getElementById('kpiTotalCompanies').textContent = stats.totalCompanies;
        document.getElementById('kpiTotalUsers').textContent = stats.totalUsers;
        document.getElementById('kpiActiveSubscriptions').textContent = stats.activeSubscriptions;

        // Renderiza o gráfico - inalterado
        renderNewCompaniesChart(stats.newCompaniesLast30Days);

        // CHAMA A NOVA FUNÇÃO AQUI
        renderRecentCompanies(stats.recentlyAddedCompanies);

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Renderiza o gráfico de novas empresas.
 * @param {Array} chartData - Os dados para o gráfico.
 */
function renderNewCompaniesChart(chartData) {
    const canvas = document.getElementById('newCompaniesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Prepara os dados para o Chart.js
    const labels = chartData.map(item => new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    const data = chartData.map(item => item.count);

    // Destrói o gráfico anterior se ele já existir (importante ao trocar de abas)
    if (newCompaniesChart) {
        newCompaniesChart.destroy();
    }

    newCompaniesChart = new Chart(ctx, {
        type: 'line', // Gráfico de linha
        data: {
            labels: labels,
            datasets: [{
                label: 'Novas Empresas',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                tension: 0.3, // Deixa a linha mais suave
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { color: '#9ca3af', stepSize: 1 }, // Garante que a escala seja de 1 em 1
                    grid: { color: 'rgba(156, 163, 175, 0.1)' } 
                },
                x: { 
                    ticks: { color: '#9ca3af' }, 
                    grid: { color: 'rgba(156, 163, 175, 0.1)' } 
                }
            },
            plugins: { 
                legend: { display: false } // Esconde a legenda, já que só temos uma linha
            }
        }
    });
}

function renderSubscriptionsView() {
    subscriptionsView.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div class="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h2 class="text-xl font-semibold text-white">Gestão de Assinaturas</h2>
                <div class="flex items-center space-x-4">
                    <input type="text" id="subscriptionSearchInput" placeholder="Pesquisar por nome ou CNPJ..." class="w-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500">
                    <div class="flex items-center space-x-1 bg-gray-900/50 p-1 rounded-md border border-gray-700">
                        <button class="sub-filter-btn px-3 py-1 text-sm rounded-md transition-colors active" data-status="all">Todos</button>
                        <button class="sub-filter-btn px-3 py-1 text-sm rounded-md transition-colors" data-status="active">Ativas</button>
                        <button class="sub-filter-btn px-3 py-1 text-sm rounded-md transition-colors" data-status="inactive">Inativas</button>
                        <button class="sub-filter-btn px-3 py-1 text-sm rounded-md transition-colors" data-status="pending_approval">Pendentes</button>
                    </div>
                </div>
            </div>
            <div id="subscriptionsTableContainer" class="overflow-x-auto">
                <p class="text-center text-gray-400 py-8">A carregar dados...</p>
            </div>
        </div>
    `;
    
    // Adiciona os event listeners para os filtros e a pesquisa
    document.getElementById('subscriptionSearchInput').addEventListener('input', handleSubscriptionFilter);
    document.querySelectorAll('.sub-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            handleSubscriptionFilter();
        });
    });

    // Busca os dados da API
    fetchAndRenderSubscriptions();
}

async function fetchAndRenderSubscriptions() {
    showLoader();
    const container = document.getElementById('subscriptionsTableContainer');
    try {
        // Busca os dados e guarda na variável global
        allSubscriptionsData = await api.getAdminSubscriptions();
        // Renderiza a tabela com todos os dados
        renderSubscriptionsTable(allSubscriptionsData);
    } catch (error) {
        showToast(error.message, 'error');
        container.innerHTML = '<p class="text-red-400 text-center py-8">Não foi possível carregar os dados das assinaturas.</p>';
    } finally {
        hideLoader();
    }
}

function handleSubscriptionFilter() {
    const searchTerm = document.getElementById('subscriptionSearchInput').value.toLowerCase();
    const activeStatus = document.querySelector('.sub-filter-btn.active').dataset.status;

    const filteredData = allSubscriptionsData.filter(company => {
        const subStatus = company.subscription?.status || 'inactive';
        
        const matchesStatus = (activeStatus === 'all') || (subStatus === activeStatus);
        
        const matchesSearch = company.nomeEmpresa.toLowerCase().includes(searchTerm) ||
                              company.cnpj.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));
                              
        return matchesStatus && matchesSearch;
    });

    renderSubscriptionsTable(filteredData);
}

/**
 * Renderiza a tabela HTML de assinaturas com base nos dados fornecidos.
 * @param {Array} data - A lista de empresas com dados de assinatura para exibir.
 */
function renderSubscriptionsTable(data) {
    const container = document.getElementById('subscriptionsTableContainer');
    if (data.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">Nenhuma assinatura encontrada para os filtros selecionados.</p>';
        return;
    }

    const tableRows = data.map(company => {
        const sub = company.subscription || {};
        const endDate = sub.endDate ? new Date(sub.endDate).toLocaleDateString('pt-BR') : 'N/A';
        
        return `
            <tr class="border-b border-gray-700 hover:bg-gray-700/50">
                <td class="p-4">${company.nomeEmpresa}</td>
                <td class="p-4 font-mono">${formatCnpj(company.cnpj)}</td>
                <td class="p-4">${getStatusBadge(sub.status)}</td>
                <td class="p-4">${endDate}</td>
                <td class="p-4 font-mono text-xs">${sub.mercadopagoPreapprovalId || 'N/A'}</td>
                <td class="p-4 text-right">
                    <button class="view-details-btn bg-indigo-600 text-white py-1 px-3 rounded-md hover:bg-indigo-700 text-sm" data-company-id="${company._id}">Detalhes</button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="w-full text-sm text-left text-gray-300">
            <thead class="text-xs text-gray-400 uppercase bg-gray-700">
                <tr>
                    <th class="p-4">Empresa</th>
                    <th class="p-4">CNPJ</th>
                    <th class="p-4">Status</th>
                    <th class="p-4">Expira em</th>
                    <th class="p-4">ID Mercado Pago</th>
                    <th class="p-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;

    // --- CÓDIGO NOVO ADICIONADO AQUI ---
    // Após a tabela ser criada, adicionamos o event listener aos novos botões "Detalhes".
    container.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const companyId = e.target.dataset.companyId;
            showLoader();
            try {
                // Reutilizamos a lógica que já funciona para buscar os dados
                const { company, users, masterUsers } = await api.getCompanyDetails(companyId);
                // Reutilizamos a função que já abre o modal de detalhes
                openCompanyDetailsModal(company, users, masterUsers);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                hideLoader();
            }
        });
    });
}

/**
 * Retorna uma badge de status colorida em HTML.
 * @param {string} status - O status da assinatura.
 */
function getStatusBadge(status) {
    const currentStatus = status || 'inactive';
    
    const statusConfig = {
        active: { text: 'Ativa', style: 'bg-green-500/80 text-green-100' },
        inactive: { text: 'Inativa', style: 'bg-red-500/80 text-red-100' },
        pending_approval: { text: 'Pendente', style: 'bg-yellow-500/80 text-yellow-100' },
        pending: { text: 'Pendente', style: 'bg-yellow-500/80 text-yellow-100' },
        cancelled: { text: 'Cancelada', style: 'bg-gray-600 text-gray-200' },
        expired: { text: 'Expirada', style: 'bg-orange-500/80 text-orange-100' }, // <-- NOVA LINHA
        default: { text: 'Desconhecido', style: 'bg-gray-400 text-gray-800' }
    };

    const config = statusConfig[currentStatus] || statusConfig.default;
    return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold ${config.style}">${config.text}</span>`;
}

// ------ Handlers ------

/**
 * Lida com a submissão do formulário de criação de empresa.
 * @param {Event} e - O evento de submissão do formulário.
 */
async function handleAddCompanySubmit(e) {
    e.preventDefault();

    const payload = {
        nomeEmpresa: document.getElementById('addCompanyNameInput').value,
        cnpj: document.getElementById('addCompanyCnpjInput').value,
        // LINHA ADICIONADA:
        email: document.getElementById('addCompanyEmailInput').value,
        ownerUsername: document.getElementById('addOwnerUsernameInput').value,
        ownerPassword: document.getElementById('addOwnerPasswordInput').value
    };

    // Removemos o campo 'senhaEmpresa' que não está a ser usado no backend
    // delete payload.senhaEmpresa;

    showLoader();
    try {
        const data = await api.createCompany(payload);
        showToast(data.message, 'success');
        closeAddCompanyModal();
        await renderCompanyList(); // Atualiza a lista de empresas no painel
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a submissão do formulário de novo utilizador.
 * @param {Event} e - O evento de submissão do formulário.
 */
async function handleAddUserSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const companyId = form.dataset.companyId;

    if (!companyId) {
        return showToast("Erro: Nenhuma empresa selecionada.", "error");
    }

    const isAdmin = form.dataset.isAdmin === 'true';

    // (O resto da extração de dados do formulário continua igual)
    const username = document.getElementById('addUsernameInput').value.trim();
    const email = document.getElementById('addUserEmailInput').value.trim();
    const password = document.getElementById('addUserPasswordInput').value;
    const role = document.getElementById('addUserRoleSelect').value;

    if (!username || !email || !password || !role) {
        return showToast('Por favor, preencha todos os campos.', 'error');
    }

    showLoader();
    if (submitButton) submitButton.disabled = true;

    try {
        await api.registerUser(username, password, email, role, companyId);
        showToast(`Usuário '${username}' criado com sucesso!`, 'success');

        // --- INÍCIO DA MODIFICAÇÃO ---

        if (!isAdmin) {
            // Caso 1: Se for o proprietário a adicionar, atualiza o modal de gestão.
            await openManageUsersModal({ _id: companyId });
        } else {
            // Caso 2 (NOVO): Se for o admin, busca os dados atualizados e reabre o modal de detalhes.
            const updatedData = await api.getCompanyDetails(companyId);
            openCompanyDetailsModal(updatedData.company, updatedData.users, updatedData.masterUsers);
        }

        // --- FIM DA MODIFICAÇÃO ---

        closeAddUserModal();
        form.reset();

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
        if (submitButton) submitButton.disabled = false;
    }
}

// --- Funções para a Gestão de Anúncios ---

/**
 * Busca todos os anúncios da API e os exibe na lista.
 */
async function renderAnnouncements() {
    // 1. Verifica se a função já está em execução. Se estiver, para aqui.
    if (isRenderingAnnouncements) {
        return;
    }

    // 2. Sinaliza que a renderização começou.
    isRenderingAnnouncements = true;
    showLoader();
    announcementsList.innerHTML = ''; // Limpa a lista antiga

    try {
        const announcements = await api.getAllAnnouncements();
        if (announcements.length === 0) {
            announcementsList.innerHTML = '<p class="text-gray-400 text-center">Nenhum anúncio criado ainda.</p>';
        } else {
            announcements.forEach(ann => {
                const statusClass = ann.isActive ? 'bg-green-500' : 'bg-gray-500';
                const statusText = ann.isActive ? 'Ativo' : 'Inativo';

                announcementsList.insertAdjacentHTML('beforeend', `
                    <div class="bg-gray-700 rounded p-4 flex justify-between items-center">
                        <div>
                            <p class="text-white">${ann.message}</p>
                            <p class="text-xs text-gray-400">${ann.link || 'Sem link'}</p>
                        </div>
                        <div class="flex items-center space-x-3">
                            <span class="text-xs font-bold text-white px-2 py-1 rounded-full ${statusClass}">${statusText}</span>
                            <button class="edit-announcement-btn text-blue-400 hover:text-blue-300" data-id="${ann._id}"><i class="fas fa-edit"></i></button>
                            <button class="delete-announcement-btn text-red-400 hover:text-red-300" data-id="${ann._id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `);
            });
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        isRenderingAnnouncements = false;
        hideLoader();
    }
}

/**
 * Abre o modal de anúncios, seja para criar um novo ou editar um existente.
 * @param {object | null} announcement - O objeto do anúncio para editar, ou null para criar.
 */
function openAnnouncementModal(announcement = null) {
    announcementForm.reset(); // Limpa o formulário

    if (announcement) {
        // Modo Edição: Preenche o formulário com os dados existentes
        announcementModalTitle.textContent = 'Editar Anúncio';
        document.getElementById('announcementId').value = announcement._id;
        document.getElementById('announcementMessageInput').value = announcement.message;
        document.getElementById('announcementLink').value = announcement.link;
        document.getElementById('announcementIsActive').checked = announcement.isActive;
    } else {
        // Modo Criação: Deixa o formulário pronto para um novo anúncio
        announcementModalTitle.textContent = 'Novo Anúncio';
        document.getElementById('announcementId').value = '';
    }

    announcementModal.classList.remove('hidden');
}

/**
 * Lida com a submissão do formulário de anúncio (criação ou edição).
 */
async function handleAnnouncementFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('announcementId').value;
    const message = document.getElementById('announcementMessageInput').value;
    const link = document.getElementById('announcementLink').value;
    const isActive = document.getElementById('announcementIsActive').checked;
    const payload = { message, link, isActive };
    showLoader();
    try {
        if (id) {
            // Se tem um ID, é uma atualização
            await api.updateAnnouncement(id, payload);
            showToast('Anúncio atualizado com sucesso!', 'success');
        } else {
            // Se não tem ID, é uma criação
            await api.createAnnouncement(payload);
            showToast('Anúncio criado com sucesso!', 'success');
        }
        if (announcementModal) {
            announcementModal.classList.add('hidden');
        }

        await renderAnnouncements(); // Atualiza a lista
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Alterna entre as vistas do sub-menu da aba de E-mails.
 * @param {'edit' | 'bulk'} subViewToShow - A vista a ser mostrada.
 */
function switchEmailSubView(subViewToShow) {
    const editBtn = document.getElementById('email-submenu-edit');
    const bulkBtn = document.getElementById('email-submenu-bulk');
    const contentDiv = document.getElementById('email-subview-content');
    contentDiv.innerHTML = ''; // Limpa o conteúdo anterior

    // Reseta o estilo dos botões
    [editBtn, bulkBtn].forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('text-gray-400', 'hover:bg-gray-700');
    });

    if (subViewToShow === 'edit') {
        editBtn.classList.add('bg-indigo-600', 'text-white');
        editBtn.classList.remove('text-gray-400', 'hover:bg-gray-700');
        renderEmailEditorView(); // Função que desenha o editor de templates
    } else if (subViewToShow === 'bulk') {
        bulkBtn.classList.add('bg-indigo-600', 'text-white');
        bulkBtn.classList.remove('text-gray-400', 'hover:bg-gray-700');
        renderBulkEmailView(); // Função que desenha o formulário de envio em massa
    }
}

/**
 * Renderiza a estrutura da vista de Configurações e busca os templates de e-mail.
 */
function renderSettingsView() {
    settingsView.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col">
            <div class="flex border-b border-gray-700 mb-4">
                <button id="email-submenu-edit" class="email-submenu-btn px-4 py-2 text-sm font-medium">Editar Templates</button>
                <button id="email-submenu-bulk" class="email-submenu-btn px-4 py-2 text-sm font-medium">Envio em Massa</button>
            </div>

            <div id="email-subview-content" class="flex-grow">
                </div>
        </div>
    `;

    // Adiciona os event listeners para os botões do sub-menu
    document.getElementById('email-submenu-edit').addEventListener('click', () => switchEmailSubView('edit'));
    document.getElementById('email-submenu-bulk').addEventListener('click', () => switchEmailSubView('bulk'));

    // Abre a vista de "Editar" por defeito
    switchEmailSubView('edit');
}

/**
 * Renderiza a estrutura completa da vista de edição de e-mails, incluindo o painel de teste.
 */
async function renderEmailEditorView() {
    const container = document.getElementById('email-subview-content');

    // 1. O HTML agora inclui a nova secção "Testar Envio" dentro da coluna do editor.
    container.innerHTML = `
        <div class="flex space-x-6 h-full">
            <div class="w-1/4 border-r border-gray-700 pr-6 flex flex-col">
                <h3 class="text-xl font-semibold text-gray-100 mb-4">Templates de E-mail</h3>
                <div id="emailTemplatesList" class="space-y-2 flex-grow overflow-y-auto"></div>
            </div>
            
            <div id="emailEditorContainer" class="w-5/12 opacity-50 pointer-events-none flex flex-col">
                <div class="flex-grow">
                    <h4 id="editingTemplateName" class="text-lg font-bold text-indigo-400 mb-4">Selecione um template para editar</h4>
                    <div class="space-y-4">
                        <div>
                            <label for="templateSubject" class="block text-sm font-medium text-gray-300">Assunto</label>
                            <input type="text" id="templateSubject" class="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                        </div>
                        <div>
                            <label for="templateBody" class="block text-sm font-medium text-gray-300">Corpo do E-mail</label>
                            <textarea id="templateBody" rows="10" class="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm"></textarea>
                        </div>
                        <div class="flex justify-end">
                            <button id="saveEmailTemplateBtn" class="bg-green-600 text-white py-2 px-5 rounded-md hover:bg-green-700">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
                
                <div id="emailTestSendContainer" class="mt-6 border-t border-gray-700 pt-4">
                    <h4 class="text-lg font-semibold text-gray-300 mb-2">Testar Envio</h4>
                    <div class="space-y-3">
                        <div>
                            <label for="testCompanySelect" class="block text-sm font-medium text-gray-400">Usar dados da empresa:</label>
                            <select id="testCompanySelect" class="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                                <option>Selecione um template primeiro</option>
                            </select>
                        </div>
                        <div>
                            <label for="testRecipientEmail" class="block text-sm font-medium text-gray-400">Enviar e-mail de teste para:</label>
                            <input type="email" id="testRecipientEmail" class="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" placeholder="seu.email@exemplo.com">
                        </div>
                        <div class="flex justify-end">
                            <button id="sendTestEmailBtn" class="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700">Enviar Teste</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="w-1/3">
                 <h4 class="text-lg font-bold text-gray-400 mb-4">Pré-visualização</h4>
                 <div class="border border-gray-700 rounded-md h-[85%] bg-white">
                    <iframe id="emailPreviewFrame" class="w-full h-full"></iframe>
                 </div>
            </div>
        </div>
    `;

    // 2. Chama a função que irá buscar os dados e configurar toda a interatividade
    await fetchAndSetupEmailEditor();
}

/**
 * Atualiza a pré-visualização do e-mail dentro da iframe.
 * @param {string} htmlContent - O conteúdo HTML completo do template.
 */
function updateEmailPreview(htmlContent) {
    const previewFrame = document.getElementById('emailPreviewFrame');
    if (!previewFrame) return;

    const previewDoc = previewFrame.contentWindow.document;

    // 1. Escrevemos o conteúdo EXATO do seu template na iframe.
    previewDoc.open();
    previewDoc.write(htmlContent);
    previewDoc.close();

    // 2. (A CORREÇÃO) Após o conteúdo ser carregado, definimos a cor de fundo
    //    do corpo da iframe para ser a mesma do seu template de e-mail.
    if (previewDoc.body) {
        previewDoc.body.style.backgroundColor = '#f4f7f6'; // O cinzento claro do seu template
    }
}

/**
 * Busca os templates e empresas, e configura todos os eventos do editor e do painel de teste.
 */
async function fetchAndSetupEmailEditor() {
    const templatesListDiv = document.getElementById('emailTemplatesList');
    const editorContainer = document.getElementById('emailEditorContainer');
    const saveBtn = document.getElementById('saveEmailTemplateBtn');
    const templateBodyTextarea = document.getElementById('templateBody');
    const previewFrame = document.getElementById('emailPreviewFrame');

    try {
        const templates = await api.getEmailTemplates();
        templatesListDiv.innerHTML = templates.map(t =>
            `<button class="email-template-item text-left w-full p-3 rounded-md hover:bg-indigo-600 focus:outline-none focus:bg-indigo-600" data-id="${t._id}" data-name="${t.name}">
                <span class="font-semibold text-white">${t.name}</span>
                <span class="block text-xs text-gray-400 truncate">${t.subject}</span>
            </button>`
        ).join('');

        document.querySelectorAll('.email-template-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const target = e.currentTarget;
                currentEditingTemplateId = target.dataset.id;
                
                document.querySelectorAll('.email-template-item').forEach(i => i.classList.remove('bg-indigo-600'));
                target.classList.add('bg-indigo-600');
                
                showLoader();
                try {
                    const fullTemplate = await api.getEmailTemplateById(currentEditingTemplateId);
                    
                    document.getElementById('editingTemplateName').textContent = `A editar: ${fullTemplate.name}`;
                    document.getElementById('templateSubject').value = fullTemplate.subject;
                    templateBodyTextarea.value = fullTemplate.body;
                    
                    updateEmailPreview(fullTemplate.body);
                    editorContainer.classList.remove('opacity-50', 'pointer-events-none');

                    // Popula o dropdown de empresas para o teste
                    const companies = await api.getCompanies();
                    const companySelect = document.getElementById('testCompanySelect');
                    companySelect.innerHTML = companies.map(c => `<option value="${c._id}">${c.nomeEmpresa}</option>`).join('');

                } catch (error) {
                    showToast('Erro ao carregar detalhes do template.', 'error');
                } finally {
                    hideLoader();
                }
            });
        });

    } catch (error) {
        templatesListDiv.innerHTML = '<p class="text-red-400">Erro ao carregar templates.</p>';
    }

    templateBodyTextarea.addEventListener('input', (e) => {
        updateEmailPreview(e.target.value);
    });

    saveBtn.addEventListener('click', async () => {
        if (!currentEditingTemplateId) return;
        const subject = document.getElementById('templateSubject').value;
        const body = templateBodyTextarea.value;
        showLoader();
        try {
            await api.updateEmailTemplate(currentEditingTemplateId, { subject, body });
            showToast('Template salvo com sucesso!', 'success');
        } catch (error) {
            showToast('Erro ao salvar o template.', 'error');
        } finally {
            hideLoader();
        }
    });

    // Novo listener para o botão de teste
    document.getElementById('sendTestEmailBtn').addEventListener('click', async () => {
        const templateNameElement = document.getElementById('editingTemplateName');
        if (!templateNameElement || !currentEditingTemplateId) {
            return showToast('Selecione um template para testar.', 'error');
        }
        
        const templateName = templateNameElement.textContent.replace('A editar: ', '');
        const companyId = document.getElementById('testCompanySelect').value;
        const recipientEmail = document.getElementById('testRecipientEmail').value;

        if (!recipientEmail) {
            return showToast('Por favor, insira um e-mail para o envio do teste.', 'error');
        }

        showLoader();
        try {
            const response = await api.sendTestEmail({ templateName, companyId, recipientEmail });
            showToast(response.message, 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    });
}
function renderBulkEmailView() {
    const container = document.getElementById('email-subview-content');
    container.innerHTML = `
        <div class="space-y-4">
            <div>
                <label for="bulkEmailAudience" class="block text-sm font-medium text-gray-300">Enviar Para</label>
                <select id="bulkEmailAudience" class="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                    <option value="allProprietors">Todos os Proprietários</option>
                    <option value="activeSubscribers">Apenas Empresas com Assinatura Ativa</option>
                    <option value="inactiveSubscribers">Apenas Empresas com Assinatura Inativa</option>
                    <option value="allUsers">Todos os Utilizadores (CUIDADO!)</option>
                </select>
            </div>
            <div>
                <label for="bulkEmailSubject" class="block text-sm font-medium text-gray-300">Assunto</label>
                <input type="text" id="bulkEmailSubject" class="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
            </div>
            <div>
                <label for="bulkEmailBody" class="block text-sm font-medium text-gray-300">Corpo do E-mail (suporta HTML)</label>
                <textarea id="bulkEmailBody" rows="12" class="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm"></textarea>
            </div>
            <div class="flex justify-end">
                <button id="sendBulkEmailBtn" class="bg-blue-600 text-white py-2 px-5 rounded-md hover:bg-blue-700">Enviar E-mail em Massa</button>
            </div>
        </div>
    `;

    // Adiciona o event listener para o botão de envio
    document.getElementById('sendBulkEmailBtn').addEventListener('click', handleSendBulkEmail);
}

async function handleSendBulkEmail() {
    const audience = document.getElementById('bulkEmailAudience').value;
    const subject = document.getElementById('bulkEmailSubject').value;
    const body = document.getElementById('bulkEmailBody').value;

    if (!subject || !body) {
        showToast('Assunto e Corpo do e-mail são obrigatórios.', 'error');
        return;
    }

    if (confirm(`Tem a certeza que deseja enviar este e-mail para o público selecionado: "${audience}"?`)) {
        showLoader();
        try {
            const response = await api.sendBulkEmail({ audience, subject, body });
            showToast(response.message, 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    }
}

function renderSearchResults(results) {
    const container = document.getElementById('searchResultsContainer');
    if (!results || (results.users.length === 0 && results.companies.length === 0)) {
        container.innerHTML = '<p class="text-gray-400 text-center">Nenhum resultado encontrado.</p>';
        return;
    }

    let html = '';

    // Renderiza os resultados dos utilizadores
    if (results.users.length > 0) {
        html += '<h4 class="text-lg font-semibold text-indigo-400 mb-2">Utilizadores Encontrados</h4>';
        html += results.users.map(user => `
            <div class="bg-gray-700/50 p-3 rounded-md mb-2 flex justify-between items-center">
                <div>
                    <p class="font-bold text-white">${user.username} <span class="text-xs font-light text-gray-300">(${user.email})</span></p>
                    <p class="text-sm text-gray-400">Empresa: ${user.company.nomeEmpresa}</p>
                </div>
                <button class="view-details-btn bg-indigo-600 text-white py-1 px-3 rounded-md hover:bg-indigo-700 text-sm" data-company-id="${user.company._id}">Ver Empresa</button>
            </div>
        `).join('');
    }

    // Renderiza os resultados das empresas
    if (results.companies.length > 0) {
        html += '<h4 class="text-lg font-semibold text-indigo-400 mt-4 mb-2">Empresas Encontradas</h4>';
        html += results.companies.map(company => `
            <div class="bg-gray-700/50 p-3 rounded-md mb-2 flex justify-between items-center">
                <div>
                    <p class="font-bold text-white">${company.nomeEmpresa}</p>
                    <p class="text-sm text-gray-400 font-mono">${formatCnpj(company.cnpj)}</p>
                </div>
                <button class="view-details-btn bg-indigo-600 text-white py-1 px-3 rounded-md hover:bg-indigo-700 text-sm" data-company-id="${company._id}">Detalhes</button>
            </div>
        `).join('');
    }

    container.innerHTML = html;

    // IMPORTANTE: Adiciona os event listeners aos novos botões de "Detalhes" criados na pesquisa
    container.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const companyId = e.target.dataset.companyId;
            showLoader();
            try {
                const { company, users, masterUsers } = await api.getCompanyDetails(companyId);
                openCompanyDetailsModal(company, users, masterUsers);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                hideLoader();
            }
        });
    });
}

/**
 * Renderiza a lista de empresas adicionadas recentemente.
 * @param {Array} companies - A lista de empresas recentes vinda da API.
 */
function renderRecentCompanies(companies) {
    const container = document.getElementById('recentCompaniesList');
    if (!container) return;

    if (!companies || companies.length === 0) {
        container.innerHTML = '<p class="text-gray-400">Nenhuma empresa registada recentemente.</p>';
        return;
    }

    container.innerHTML = companies.map(company => `
        <div class="bg-gray-700/50 p-3 rounded-md flex justify-between items-center">
            <div>
                <p class="font-semibold text-white">${company.nomeEmpresa}</p>
                <p class="text-xs text-gray-400">Registada em: ${new Date(company.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
            <button class="view-details-btn bg-indigo-600 text-white py-1 px-3 rounded-md hover:bg-indigo-700 text-sm" data-company-id="${company._id}">
                Detalhes
            </button>
        </div>
    `).join('');

    // Adiciona os eventos de clique aos novos botões "Detalhes"
    container.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const companyId = e.target.dataset.companyId;
            showLoader();
            try {
                const { company, users, masterUsers } = await api.getCompanyDetails(companyId);
                openCompanyDetailsModal(company, users, masterUsers);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                hideLoader();
            }
        });
    });
}

// =================================================================================
// =================================================================================
// EVENT LISTENERS
// =================================================================================
// =================================================================================

if (viewSettingsTab) viewSettingsTab.addEventListener('click', () => switchAdminView('settings'));

if (viewSubscriptionsTab) viewSubscriptionsTab.addEventListener('click', () => switchAdminView('subscriptions'));

// --- DashBoard ---
if (viewDashboardTab) viewDashboardTab.addEventListener('click', () => switchAdminView('dashboard'));


if (viewCompaniesTab) viewCompaniesTab.addEventListener('click', () => switchAdminView('companies'));
if (viewAnnouncementsTab) viewAnnouncementsTab.addEventListener('click', () => switchAdminView('announcements'));
// Abas
if (viewCompaniesTab) viewCompaniesTab.addEventListener('click', () => switchAdminView('companies'));
if (viewAnnouncementsTab) viewAnnouncementsTab.addEventListener('click', () => switchAdminView('announcements'));


if (addUserForm) addUserForm.addEventListener('submit', handleAddUserSubmit);
if (closeAddUserModalBtn) closeAddUserModalBtn.addEventListener('click', closeAddUserModal);
if (cancelAddUserBtn) cancelAddUserBtn.addEventListener('click', closeAddUserModal);
if (addCompanyForm) addCompanyForm.addEventListener('submit', handleAddCompanySubmit);
if (closeAddCompanyModalBtn) closeAddCompanyModalBtn.addEventListener('click', closeAddCompanyModal);
if (cancelAddCompanyBtn) cancelAddCompanyBtn.addEventListener('click', closeAddCompanyModal);

// Botões do modal de anúncios
if (openAnnouncementModalBtn) {
    openAnnouncementModalBtn.addEventListener('click', () => openAnnouncementModal());
}

if (announcementForm) {
    announcementForm.addEventListener('submit', handleAnnouncementFormSubmit);
}

if (cancelAnnouncementBtn) {
    cancelAnnouncementBtn.addEventListener('click', () => {
        if (announcementModal) {
            announcementModal.classList.add('hidden');
        }
    });
}

// Eventos na lista de anúncios (para os botões de editar e apagar)
if (announcementsList) {
    announcementsList.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-announcement-btn');
        const deleteBtn = e.target.closest('.delete-announcement-btn');

        if (editBtn) {
            showLoader();
            try {
                const allAnnouncements = await api.getAllAnnouncements();
                const annToEdit = allAnnouncements.find(a => a._id === editBtn.dataset.id);
                if (annToEdit) openAnnouncementModal(annToEdit);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                hideLoader();
            }
        }

        if (deleteBtn) {
            if (confirm('Tem a certeza que deseja apagar este anúncio?')) {
                showLoader();
                try {
                    await api.deleteAnnouncement(deleteBtn.dataset.id);
                    showToast('Anúncio apagado com sucesso.', 'success');
                    await renderAnnouncements();
                } catch (error) {
                    showToast(error.message, 'error');
                } finally {
                    hideLoader();
                }
            }
        }
    });
}
const adminNavSelect = document.getElementById('admin-nav-select');
if (adminNavSelect) {
    adminNavSelect.addEventListener('change', (e) => {
        // Chama a função que já usas para trocar de vista,
        // passando o valor da opção selecionada.
        switchAdminView(e.target.value);
    });
}
