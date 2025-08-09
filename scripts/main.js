/**
 * main.js
 * Ponto de entrada e orquestrador principal para a aplicação Organizador de Boletos.
 * Este ficheiro inicializa a aplicação, gere o estado e configura todos os eventos.
 */

// =================================================================================
// IMPORTS - Trazemos as ferramentas dos outros módulos
// =================================================================================
import { API_BASE_URL } from './config.js';
import * as api from './api.js';
import { showToast, showLoader, hideLoader, formatCnpj, hideAllScreens } from './utils.js';
import { openManageUsersModal, openAddUserModal } from './admin.js';


// =================================================================================
// ESTADO DA APLICAÇÃO - Variáveis que guardam o estado atual
// =================================================================================
let currentLoggedInCompany = null;
let currentLoggedInUser = null;
export let isAdminLoggedIn = false;
let loggedInViaAdmin = false;
let selectedCompanyForAdmin = null;
let currentBill = {};
let selectedParcel = null;
let userBoletos = [];
let currentMonth, currentYear;
let currentDailyViewDate;
let expensesPieChart = null;

let dailyListContainer = null;
let dailyDateDisplay = null;
let noDailyBillsMessage = null;

let expensesBarChart = null;
let topExpensesChart = null;
let parsedCsvData = [];
let selectedParcels = new Set();
let dashboardStatusFilter = 'all';
let selectedItems = new Map();
let pendingUpdateData = null;

// =================================================================================
// ELEMENTOS DO DOM - Referências aos elementos HTML
// =================================================================================

const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const mainAppContent = document.getElementById('mainAppContent');
const logoutBtn = document.getElementById('logoutBtn');
const backToAdminBtn = document.getElementById('backToAdminBtn');
const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
const settingsMenuContainer = document.getElementById('settingsMenuContainer');
const openAddBillModalBtn = document.getElementById('openAddBillModalBtn');
const totalBillsSpan = document.getElementById('totalBills');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const calendarDays = document.getElementById('calendarDays');
const currentMonthYear = document.getElementById('currentMonthYear');
const billForm = document.getElementById('billForm');
const addBillModal = document.getElementById('addBillModal');
const closeAddBillModalBtn = document.getElementById('closeAddBillModalBtn');
const installmentsList = document.getElementById('installmentsList');
const parcelPreviewTotalSpan = document.getElementById('parcelPreviewTotal');
const addToOrganizer = document.getElementById('addToOrganizer');
const billModal = document.getElementById('billModal');
const closeModalBtn = document.getElementById('closeModal');
const modalBillName = document.getElementById('modalBillName');
const modalBillAmount = document.getElementById('modalBillAmount');
const modalBillDate = document.getElementById('modalBillDate');
const modalBillDescription = document.getElementById('modalBillDescription');
const modalBillBarcodeInput = document.getElementById('modalBillBarcode');
const showFullScreenBarcodeBtn = document.getElementById('showFullScreenBarcodeBtn');
const modalBillPaidCheckbox = document.getElementById('modalBillPaid');
const saveBillBtn = document.getElementById('saveBill');
const deleteBillBtn = document.getElementById('deleteBill');
const deleteEntireBillBtn = document.getElementById('deleteEntireBillBtn');
const barcodeFullScreenModal = document.getElementById('barcodeFullScreenModal');
const closeFullScreenBarcodeBtn = document.getElementById('closeFullScreenBarcodeBtn');
const subscriptionModal = document.getElementById('subscriptionModal');
const subscriptionTitle = document.getElementById('subscriptionTitle');
const subscriptionMessage = document.getElementById('subscriptionMessage');
const subscriptionIcon = document.getElementById('subscriptionIcon');
const subscriptionActionBtn = document.getElementById('subscriptionActionBtn');
const subscriptionLogoutBtn = document.getElementById('subscriptionLogoutBtn');
const blockedAccessLogoutBtn = document.getElementById('blockedAccessLogoutBtn');
const addCompanyCnpjInput = document.getElementById('addCompanyCnpjInput');
const settingsBtn = document.getElementById('settingsBtn');
const settingsDropdown = document.getElementById('settingsDropdown');
const menuEmpresa = document.getElementById('menuEmpresa');
const menuUsuarios = document.getElementById('menuUsuarios');
const menuPermissoes = document.getElementById('menuPermissoes');
const companyInfoModal = document.getElementById('companyInfoModal');
const closeCompanyInfoModal = document.getElementById('closeCompanyInfoModal');
const saveCompanyInfoBtn = document.getElementById('saveCompanyInfoBtn');
const permissionsModal = document.getElementById('permissionsModal');
const closePermissionsModal = document.getElementById('closePermissionsModal');
const savePermissionsBtn = document.getElementById('savePermissionsBtn');
const manageUsersModal = document.getElementById('manageUsersModal');
const closeManageUsersModal = document.getElementById('closeManageUsersModal');
const addCompanyUserBtn = document.getElementById('addCompanyUserBtn');
const installmentsPreviewModal = document.getElementById('installmentsPreviewModal');
const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');
const nfeXmlInput = document.getElementById('nfeXmlInput');
const previewBillNameInput = document.getElementById('previewBillNameInput');
const previewNfeNumber = document.getElementById('previewNfeNumber');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const menuCategorias = document.getElementById('menuCategorias');
const categoriesModal = document.getElementById('categoriesModal');
const closeCategoriesModal = document.getElementById('closeCategoriesModal');
const addCategoryForm = document.getElementById('addCategoryForm');
const newCategoryNameInput = document.getElementById('newCategoryName');
const categoryListDiv = document.getElementById('categoryList');
const modalBillCategorySelect = document.getElementById('modalBillCategorySelect');
const categoryFilterSelect = document.getElementById('categoryFilterSelect');

const viewCalendarBtn = document.getElementById('viewCalendarBtn');
const viewDashboardBtn = document.getElementById('viewDashboardBtn');
const calendarView = document.getElementById('calendarView');
const dashboardView = document.getElementById('dashboardView');
const dateRangePresetSelect = document.getElementById('date-range-preset-select');
const customDateRangeInputs = document.getElementById('custom-date-range-inputs');
const startDateInput = document.getElementById('start-date-input');
const endDateInput = document.getElementById('end-date-input');
const kpiContasVencidas = document.getElementById('kpiContasVencidas');
const upcomingPaymentsList = document.getElementById('upcoming-payments-list');
const noUpcomingPaymentsMessage = document.getElementById('no-upcoming-payments-message');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const dashboardFilterButtons = document.querySelectorAll('.dashboard-filter-btn');

const manualAddBtn = document.getElementById('manual-add-btn');
const xmlAddBtn = document.getElementById('xml-add-btn');
const manualAddForm = document.getElementById('manual-add-form');
const xmlAddForm = document.getElementById('xml-add-form');

const csvImportBtn = document.getElementById('csv-import-btn');
const csvImportForm = document.getElementById('csv-import-form');
const csvFileInput = document.getElementById('csv-file-input');
const csvPreviewArea = document.getElementById('csv-preview-area');
const csvPreviewTableBody = document.getElementById('csv-preview-table-body');
const csvImportSummary = document.getElementById('csv-import-summary');
const importCsvBtn = document.getElementById('import-csv-btn');

const markSelectedAsPaidBtn = document.getElementById('markSelectedAsPaidBtn');
const selectedCountSpan = document.getElementById('selectedCount');
const massActionsContainer = document.getElementById('massActionsContainer');
const selectAllVisibleBtn = document.getElementById('selectAllVisibleBtn');
const deselectAllVisibleBtn = document.getElementById('deselectAllVisibleBtn');

const changeCategoryBtn = document.getElementById('changeCategoryBtn');
const categoryBatchModal = document.getElementById('categoryBatchModal');
const batchCategorySelect = document.getElementById('batchCategorySelect');
const cancelCategoryBatchBtn = document.getElementById('cancelCategoryBatchBtn');
const confirmCategoryBatchBtn = document.getElementById('confirmCategoryBatchBtn');

const openProfileModalBtn = document.getElementById('openProfileModalBtn');
const profileModal = document.getElementById('profileModal');
const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
const profileUsername = document.getElementById('profileUsername');
const profileRole = document.getElementById('profileRole');
const profileCompany = document.getElementById('profileCompany');
const changePasswordForm = document.getElementById('changePasswordForm');
const verificationNotice = document.getElementById('verificationNotice');
const resendVerificationBtn = document.getElementById('resendVerificationBtn');

const recurrentAddBtn = document.getElementById('recurrent-add-btn');
const recurrentAddForm = document.getElementById('recurrent-add-form');
const recurrentEditModal = document.getElementById('recurrentEditModal');
const cancelRecurrentEditBtn = document.getElementById('cancelRecurrentEditBtn');
const singleParcelDate = document.getElementById('single-parcel-date');

const globalAnnouncementBanner = document.getElementById('globalAnnouncementBanner');
const announcementMessage = document.getElementById('announcementMessage');
const closeAnnouncementBtn = document.getElementById('closeAnnouncementBtn');

// =================================================================================
// FUNÇÕES DE LÓGICA E UI
// =================================================================================

/**
 * Atualiza o resumo financeiro. A lógica agora é adaptativa:
 * - Em vistas desktop, mostra os totais do MÊS.
 * - Em vistas móveis, mostra os totais do DIA.
 * @param {Array} boletosForSummary - A lista de boletos a ser usada (filtrada ou completa).
 */
function updateMonthlySummary(boletosForSummary = userBoletos) {
    const dailyViewContainer = document.getElementById('dailyBillsViewer');
    const isMobileView = dailyViewContainer && dailyViewContainer.offsetParent !== null;

    const totalLabel = document.getElementById('summaryTotalLabel');
    const paidLabel = document.getElementById('summaryPaidLabel');
    const unpaidLabel = document.getElementById('summaryUnpaidLabel');

    const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueParcels = boletosForSummary.flatMap(bill => bill.parcels)
        .filter(parcel => !parcel.paid && new Date(parcel.dueDate + 'T00:00:00') < today);
    const totalOverdue = overdueParcels.reduce((sum, parcel) => sum + parcel.amount, 0);
    document.getElementById('summaryOverdue').textContent = formatCurrency(totalOverdue);

    if (isMobileView) {
        // --- LÓGICA PARA A VISTA MÓVEL (DIÁRIA) ---

        // Altera os títulos para as versões curtas que você pediu
        if (totalLabel) totalLabel.textContent = 'Total';
        if (paidLabel) paidLabel.textContent = 'Pago';
        if (unpaidLabel) unpaidLabel.textContent = 'Não Pago';

        const dateStr = currentDailyViewDate.toISOString().split('T')[0];
        const parcelsForDay = boletosForSummary.flatMap(bill => bill.parcels)
            .filter(parcel => parcel.dueDate === dateStr);

        const totalDia = parcelsForDay.reduce((sum, parcel) => sum + parcel.amount, 0);
        const totalPagoDia = parcelsForDay.filter(p => p.paid).reduce((sum, parcel) => sum + parcel.amount, 0);
        const totalNaoPagoDia = totalDia - totalPagoDia;

        document.getElementById('summaryTotal').textContent = formatCurrency(totalDia);
        document.getElementById('summaryPaid').textContent = formatCurrency(totalPagoDia);
        document.getElementById('summaryUnpaid').textContent = formatCurrency(totalNaoPagoDia);

    } else {
        // --- LÓGICA PARA A VISTA DESKTOP (MENSAL) ---

        // Garante que os títulos na vista desktop também sejam de uma linha
        if (totalLabel) totalLabel.textContent = 'Total no Mês';
        if (paidLabel) paidLabel.textContent = 'Total Pago';
        if (unpaidLabel) unpaidLabel.textContent = 'Não Pago';

        const parcelsThisMonth = boletosForSummary.flatMap(bill => bill.parcels)
            .filter(parcel => {
                const parcelDate = new Date(parcel.dueDate + 'T00:00:00');
                return parcelDate.getMonth() === currentMonth && parcelDate.getFullYear() === currentYear;
            });

        const totalMes = parcelsThisMonth.reduce((sum, parcel) => sum + parcel.amount, 0);
        const totalPagoMes = parcelsThisMonth.filter(p => p.paid).reduce((sum, parcel) => sum + parcel.amount, 0);
        const totalNaoPagoMes = totalMes - totalPagoMes;

        document.getElementById('summaryTotal').textContent = formatCurrency(totalMes);
        document.getElementById('summaryPaid').textContent = formatCurrency(totalPagoMes);
        document.getElementById('summaryUnpaid').textContent = formatCurrency(totalNaoPagoMes);
    }
}


/**
 * Renderiza o calendário com uma lista específica de boletos.
 * VERSÃO FINAL - Otimizada, com melhorias visuais e todas as funcionalidades.
 * @param {Array} boletosToRender - A lista de boletos a ser exibida.
 */
function renderCalendar(boletosToRender = userBoletos) {
    const calendarContainer = document.getElementById('calendarDays')?.parentElement;
    // Otimização: Se o container do calendário não estiver visível (telas pequenas), não executa a renderização.
    if (!calendarContainer || calendarContainer.offsetParent === null) {
        return;
        console.log("-> 'renderCalendar' PAROU (container invisível).");
    }

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const currentMonthYear = document.getElementById('currentMonthYear');
    const calendarDays = document.getElementById('calendarDays');

    if (!currentMonthYear || !calendarDays) return;

    currentMonthYear.textContent = `${monthNames[currentMonth]} de ${currentYear}`;
    calendarDays.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parcelsByDate = new Map();
    boletosToRender.forEach(bill => {
        bill.parcels.forEach(parcel => {
            const date = parcel.dueDate;
            if (!parcelsByDate.has(date)) {
                parcelsByDate.set(date, []);
            }
            parcelsByDate.get(date).push({ ...parcel,
                parentBill: bill
            });
        });
    });

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.insertAdjacentHTML('beforeend', '<div class="day-cell empty p-1 border border-gray-800"></div>');
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell day-cell-droppable p-1 border border-gray-800 relative cursor-pointer hover:bg-gray-600 transition-colors overflow-y-auto';
        dayCell.dataset.date = dateStr;

        const dayHeader = document.createElement('div');
        dayHeader.className = 'text-right font-medium text-sm mb-1 text-gray-300';
        dayHeader.textContent = day;
        dayCell.appendChild(dayHeader);

        dayCell.addEventListener('click', (e) => {
            if (e.target.closest('.bill-card-draggable')) return;
            openAddBillModal(e.currentTarget.dataset.date);
        });

        if (parcelsByDate.has(dateStr)) {
            parcelsByDate.get(dateStr).forEach(parcel => {
                const bill = parcel.parentBill;
                const parcelElement = document.createElement('div');
                const dueDate = new Date(parcel.dueDate + 'T00:00:00');
                const isOverdue = !parcel.paid && dueDate < today;
                let statusClass = 'bg-indigo-700 text-indigo-100';
                let statusIcon = '<i class="fas fa-clock fa-xs"></i>';

                if (parcel.paid) {
                    statusClass = 'bg-green-700 text-green-100';
                    statusIcon = '<i class="fas fa-check fa-xs"></i>';
                } else if (isOverdue) {
                    statusClass = 'bg-red-700 text-red-100';
                    statusIcon = '<i class="fas fa-exclamation-triangle fa-xs"></i>';
                }

                parcelElement.className = `bill-card-draggable text-xs p-2 mb-1 rounded cursor-grab ${statusClass}`;
                parcelElement.dataset.boletoId = bill._id;
                parcelElement.dataset.parcelId = parcel._id;

                parcelElement.innerHTML = `
                    <div class="flex items-start space-x-2">
                        <input type="checkbox" id="checkbox-${parcel._id}" class="mass-payment-checkbox mt-1 flex-shrink-0" data-parcel-id="${parcel._id}" ${selectedItems.has(parcel._id) ? 'checked' : ''}>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-center">
                                <span class="font-medium text-white truncate" title="${bill.name} (${parcel.number}ª)">
                                    ${statusIcon} ${bill.name} (${parcel.number}ª)
                                </span>
                                <span class="font-semibold text-white flex-shrink-0 ml-2">
                                    ${parcel.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                            ${bill.nfeNumber ? `<div class="text-xs text-gray-300 truncate mt-1" title="NFe Nº ${bill.nfeNumber}">COD: ${bill.nfeNumber}</div>` : ''}
                            ${bill.category ? `<div class="text-xs text-gray-300 truncate mt-1"><i class="fas fa-tag fa-xs mr-1 opacity-70"></i>${bill.category.name}</div>` : ''}
                        </div>
                    </div>
                `;
                parcelElement.addEventListener('click', () => openBillModal(bill, parcel));
                const checkbox = parcelElement.querySelector('.mass-payment-checkbox');
                checkbox.addEventListener('change', (e) => {
                    const parcelId = e.target.dataset.parcelId;
                    const boletoId = e.target.closest('.bill-card-draggable').dataset.boletoId;
                    if (e.target.checked) {
                        selectedItems.set(parcelId, boletoId);
                    } else {
                        selectedItems.delete(parcelId);
                    }
                    updateMassPaymentButton();
                });
                checkbox.addEventListener('click', (e) => e.stopPropagation());
                dayCell.appendChild(parcelElement);
            });
        }
        calendarDays.appendChild(dayCell);
    }
    initializeDragAndDrop();
}

/**
 * Abre o modal para ver/editar os detalhes de uma parcela.
 * @param {object} bill - O objeto do boleto pai, que contém o nome e o nfeNumber.
 * @param {object} parcel - O objeto da parcela específica.
 */
async function openBillModal(bill, parcel) {
    // Guarda a referência da parcela selecionada para ser usada por outras funções (salvar, apagar, etc.)
    selectedParcel = { ...parcel, parentId: bill._id };

    // Preenche todos os campos do modal com os dados da parcela clicada
    modalBillName.textContent = `${bill.name} (Parcela ${parcel.number})`;
    modalBillName.title = `${bill.name} (Parcela ${parcel.number})`; // Adiciona o nome completo no hover
    modalBillAmount.value = parcel.amount.toFixed(2);
    modalBillDate.value = parcel.dueDate;
    modalBillDescription.value = parcel.description || '';
    modalBillBarcodeInput.value = parcel.barcode || '';
    modalBillPaidCheckbox.checked = parcel.paid;

    // Mostra o botão de gerar código de barras apenas se houver um código
    showFullScreenBarcodeBtn.classList.toggle('hidden', !parcel.barcode);

    // Mostra o número da NFe apenas se o boleto tiver um associado
    const nfeContainer = document.getElementById('modalNfeNumberContainer');
    const nfeNumberEl = document.getElementById('modalNfeNumber');
    if (bill.nfeNumber) {
        nfeNumberEl.textContent = bill.nfeNumber;
        nfeContainer.classList.remove('hidden');
    } else {
        nfeContainer.classList.add('hidden');
    }

    // Lógica dinâmica para a secção de anexos
    const attachmentContainer = document.getElementById('attachment-container');
    attachmentContainer.innerHTML = ''; // Limpa o conteúdo anterior

    if (parcel.attachmentUrl) {
        // Se já existe um anexo, mostra o link para o ver e um botão para o remover
        attachmentContainer.innerHTML = `
            <div class="flex items-center justify-between">
                <a href="${parcel.attachmentUrl}" target="_blank" class="text-indigo-400 hover:underline flex items-center">
                    <i class="fas fa-paperclip mr-2"></i>Ver Comprovativo
                </a>
                <button id="removeAttachmentBtn" class="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700">Remover</button>
            </div>
        `;
        // Adiciona o evento de clique ao novo botão de remover
        document.getElementById('removeAttachmentBtn').addEventListener('click', handleRemoveAttachment);
    } else {
        // Se não existe um anexo, mostra o input para fazer o upload de um ficheiro
        attachmentContainer.innerHTML = `<input type="file" id="attachmentUploadInput" accept=".pdf,.jpg,.jpeg,.png" class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gray-600 hover:file:bg-gray-700 cursor-pointer"/>`;
        // Adiciona o evento de 'change' ao novo input de upload
        document.getElementById('attachmentUploadInput').addEventListener('change', handleAttachmentUpload);
    }

    try {
        const categories = await api.getCategories();
        modalBillCategorySelect.innerHTML = '<option value="">Nenhuma</option>';
        categories.forEach(cat => {
            modalBillCategorySelect.innerHTML += `<option value="${cat._id}">${cat.name}</option>`;
        });
        if (bill.category) {
            modalBillCategorySelect.value = bill.category._id;
        } else {
            modalBillCategorySelect.value = "";
        }
    } catch (error) {
        showToast('Erro ao carregar categorias.', 'error');
    }

    billModal.classList.remove('hidden');
}

/**
 * Limpa o formulário de adicionar boletos e a pré-visualização.
 */
function clearBillForm() {
    if (billForm) {
        billForm.reset();
    }
    currentBill = {};
}

/**
 * Atualiza a interface principal com os dados dos boletos.
 */
async function updateBillsOrganizer() {
    showLoader();
    try {
        userBoletos = await api.getBoletos();

        if (!userBoletos || userBoletos.length === 0) {
            //console.log("AVISO: Nenhum boleto foi encontrado na base de dados para esta empresa.");
        }

        const totalParcels = userBoletos.reduce((acc, bill) => acc + bill.parcels.length, 0);
        const totalBillsSpan = document.getElementById('totalBills');
        
        if (totalBillsSpan) {
            totalBillsSpan.textContent = totalParcels;
        } else {
            console.error("FALHA CRÍTICA: O elemento HTML com o id 'totalBills' não foi encontrado!");
            return; // Para a execução se o elemento não existir
        }

        updateMonthlySummary();
        renderCalendar();
        renderDailyView();

    } catch (error) {
        console.error("ERRO GRAVE DENTRO DE updateBillsOrganizer:", error);
        showToast(error.message, 'error');
    }finally {
        hideLoader(); // Adicionado
    }
}

async function showMainApp() {
    try {
        // --- NOVA ABORDAGEM DIRETA ---
        const adminPanel = document.getElementById('adminDashboardScreen');
        const mainPanel = document.getElementById('mainAppContent');

        // Escondemos explicitamente o painel de admin
        if (adminPanel) {
            adminPanel.style.display = 'none';
        }
        // E mostramos explicitamente o painel da aplicação principal
        if (mainPanel) {
            mainPanel.style.display = 'block';
        }
        // --- FIM DA NOVA ABORDAGEM ---

        openAddBillModalBtn.classList.remove('hidden');
        openAddBillModalBtn.style.display = 'flex';

        loggedInUserDisplay.textContent = `Usuário: ${currentLoggedInUser.username}`;
        backToAdminBtn.classList.toggle('hidden', !loggedInViaAdmin);
        settingsMenuContainer.classList.toggle('hidden', isAdminLoggedIn || currentLoggedInUser.role !== 'Proprietário');

        await fetchAndDisplayAnnouncement();
        await populateCategoryFilter();
        await updateBillsOrganizer();
    } catch(error) {
         console.error("Erro ao exibir a aplicação principal:", error);
         showToast("Não foi possível carregar os dados da empresa.", "error");
    } finally {
        hideLoader();
    }
}

// Adicionar ao bloco de funções de Lógica e UI

/**
 * Função de ajuda para obter o conteúdo de uma tag de um documento XML.
 * @param {string} tagName - O nome da tag a ser procurada.
 * @param {Document|Element} parentElement - O elemento pai onde procurar.
 * @returns {string} - O conteúdo da tag ou uma string vazia.
 */
function getTagValue(tagName, parentElement) {
    // Verifica se o elemento pai existe antes de procurar a tag dentro dele
    const element = parentElement?.getElementsByTagName(tagName)[0];
    return element?.textContent || '';
}

/**
 * Configura e exibe o modal de assinatura para o Proprietário.
 * @param {object} company - O objeto da empresa com os dados da assinatura.
 */
function showSubscriptionModal(company) {
    hideAllScreens();
    const status = company.subscription?.status;

    if (status === 'inactive' || status === 'trial') {
        subscriptionTitle.textContent = 'Ative sua Assinatura';
        subscriptionMessage.textContent = 'Para usar o Organizador de Boletos, por favor, realize a sua assinatura e desbloqueie todas as funcionalidades.';
        subscriptionActionBtn.textContent = 'Realizar Assinatura';
        subscriptionIcon.className = 'fas fa-star text-yellow-400 text-3xl';
    } else { // 'past_due' ou outro estado
        subscriptionTitle.textContent = 'Assinatura Pendente';
        subscriptionMessage.textContent = 'Sua assinatura do Organizador de Boletos está pendente. Por favor, renove para continuar usando todas as funcionalidades.';
        subscriptionActionBtn.textContent = 'Renovar Assinatura';
        subscriptionIcon.className = 'fas fa-exclamation-triangle text-red-400 text-3xl';
    }
    if (subscriptionModal) subscriptionModal.classList.remove('hidden');
}

/**
 * Exibe o modal informando a funcionários que o acesso está bloqueado.
 */
function showAccessBlockedModal() {
    hideAllScreens();
    const accessBlockedModal = document.getElementById('accessBlockedModal');
    if (accessBlockedModal) accessBlockedModal.classList.remove('hidden');
}

/**
 * Abre o modal para criar uma nova empresa.
 */


/**
 * Fecha o modal de criar empresa.
 */




/**
 * Abre o modal com os detalhes da empresa para o Proprietário editar.
 */
async function openCompanyInfoModal() {
    showLoader();
    try {
        // A chamada à API já retorna os dados completos da empresa, incluindo 'isVerified'
        const { company } = await api.getCompanyDetails(currentLoggedInCompany._id);

        document.getElementById('companyInfoCnpj').textContent = formatCnpj(company.cnpj);
        document.getElementById('companyInfoName').value = company.nomeEmpresa || '';
        document.getElementById('companyInfoEmail').value = company.email || '';
        document.getElementById('companyInfoTelefone').value = company.telefoneFixo || '';
        document.getElementById('companyInfoWhatsapp').value = company.telefoneWhatsapp || '';

        // LÓGICA PARA MOSTRAR/ESCONDER O AVISO
        if (company.isVerified) {
            verificationNotice.classList.add('hidden');
        } else {
            verificationNotice.classList.remove('hidden');
        }

        IMask(document.getElementById('companyInfoTelefone'), { mask: '(00) 0000-0000' });
        IMask(document.getElementById('companyInfoWhatsapp'), { mask: '(00) 00000-0000' });

        companyInfoModal.classList.remove('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Abre o modal de permissões para o Proprietário.
 */
async function openPermissionsModal() {
    showLoader();
    try {
        const permissions = await api.getPermissions();

        // Preenche o modal com as permissões atuais
        document.getElementById('gerente-canCreate-boleto').checked = permissions.Gerente.canCreate;
        document.querySelector(`input[name="gerente-canUpdate"][value="${permissions.Gerente.canUpdate}"]`).checked = true;
        document.querySelector(`input[name="gerente-canDelete"][value="${permissions.Gerente.canDelete}"]`).checked = true;

        document.getElementById('funcionario-canCreate-boleto').checked = permissions.Funcionário.canCreate;
        document.querySelector(`input[name="funcionario-canUpdate"][value="${permissions.Funcionário.canUpdate}"]`).checked = true;
        document.querySelector(`input[name="funcionario-canDelete"][value="${permissions.Funcionário.canDelete}"]`).checked = true;

        permissionsModal.classList.remove('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

// --- Handlers para os botões DENTRO dos novos modais ---

async function handleSaveCompanyInfo() {
    const payload = {
        nomeEmpresa: document.getElementById('companyInfoName').value,
        email: document.getElementById('companyInfoEmail').value,
        telefoneFixo: document.getElementById('companyInfoTelefone').value,
        telefoneWhatsapp: document.getElementById('companyInfoWhatsapp').value,
    };
    showLoader();
    try {
        await api.updateCompany(currentLoggedInCompany._id, payload);
        showToast('Dados da empresa atualizados!', 'success');
        companyInfoModal.classList.add('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

async function handleSavePermissions() {
    const newPermissions = {
        Gerente: {
            canCreate: document.getElementById('gerente-canCreate-boleto').checked,
            canUpdate: document.querySelector('input[name="gerente-canUpdate"]:checked').value,
            canDelete: document.querySelector('input[name="gerente-canDelete"]:checked').value,
        },
        Funcionário: {
            canCreate: document.getElementById('funcionario-canCreate-boleto').checked,
            canUpdate: document.querySelector('input[name="funcionario-canUpdate"]:checked').value,
            canDelete: document.querySelector('input[name="funcionario-canDelete"]:checked').value,
        }
    };
    showLoader();
    try {
        await api.updatePermissions(newPermissions);
        showToast('Permissões salvas com sucesso!', 'success');
        permissionsModal.classList.add('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

async function openCategoriesModal() {
    showLoader();
    try {
        const categories = await api.getCategories();
        renderCategoryList(categories);
        categoriesModal.classList.remove('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

function renderCategoryList(categories) {
    categoryListDiv.innerHTML = '';
    if (categories.length === 0) {
        categoryListDiv.innerHTML = '<p class="text-gray-400 text-center">Nenhuma categoria criada.</p>';
        return;
    }
    categories.forEach(category => {
        categoryListDiv.insertAdjacentHTML('beforeend', `
            <div class="bg-gray-700 rounded p-2 flex justify-between items-center">
                <span class="text-white">${category.name}</span>
                <div>
                    <button class="edit-category-btn text-blue-400 hover:text-blue-300 mr-2" data-id="${category._id}" data-name="${category.name}"><i class="fas fa-edit"></i></button>
                    <button class="delete-category-btn text-red-400 hover:text-red-300" data-id="${category._id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `);
    });
}

/**
 * Abre o modal para adicionar um novo boleto,
 * e opcionalmente pré-preenchendo a data.
 * @param {string | null} preselectedDate - A data para pré-preencher no formulário.
 */
async function openAddBillModal(preselectedDate = null) {
    clearBillForm();
    switchAddBillMode('manual');
    showLoader();
    try {
        // Se uma data foi passada como parâmetro (ou seja, o utilizador clicou no calendário)
        if (preselectedDate) {
            // Preenche o campo da aba "Adicionar Manual" (comportamento que já existia)
            document.getElementById('dueDate').value = preselectedDate;

            // NOVA LINHA: Preenche também o campo da aba "Pagamento Recorrente"
            document.getElementById('recurrentStartDate').value = preselectedDate;
        }

        addBillModal.classList.remove('hidden');
    } catch (error)
 {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

async function populateCategoryFilter() {
    showLoader();
    try {
        const categories = await api.getCategories();
        categoryFilterSelect.innerHTML = '<option value="all">Todas as Categorias</option>'; // Opção padrão
        categories.forEach(category => {
            categoryFilterSelect.innerHTML += `<option value="${category._id}">${category.name}</option>`;
        });
    } catch (error) {
        console.error("Erro ao popular filtro de categorias:", error);
        // Se der erro, garante que a opção padrão exista
        categoryFilterSelect.innerHTML = '<option value="all">Todas as Categorias</option>';
    } finally {
        hideLoader();
    }
}

/**
 * Alterna a visualização entre o Calendário e o Dashboard.
 */
function switchView(viewToShow) {
    // Esconde ambas as vistas
    calendarView.classList.add('hidden');
    dashboardView.classList.add('hidden');

    // Reseta o estilo dos botões
    viewCalendarBtn.classList.remove('bg-indigo-600');
    viewCalendarBtn.classList.add('text-gray-400', 'hover:bg-gray-800');
    viewDashboardBtn.classList.remove('bg-indigo-600');
    viewDashboardBtn.classList.add('text-gray-400', 'hover:bg-gray-800');

    // Mostra a vista correta e ativa o botão correspondente
    if (viewToShow === 'calendar') {
        calendarView.classList.remove('hidden');
        viewCalendarBtn.classList.add('bg-indigo-600');
        viewCalendarBtn.classList.remove('text-gray-400', 'hover:bg-gray-800');
    } else if (viewToShow === 'dashboard') {
        dashboardView.classList.remove('hidden');
        viewDashboardBtn.classList.add('bg-indigo-600');
        viewDashboardBtn.classList.remove('text-gray-400', 'hover:bg-gray-800');
        renderDashboard();
    }
}

/**
 * Atualiza os cartões de KPI no dashboard.
 * @param {object} kpiData - Os dados dos KPIs vindos da API.
 */
function updateKpiCards(kpiData) {
    const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const pendenteMes = kpiData.totalMes - kpiData.pagoMes;

    // Popula os novos campos
    if (kpiContasVencidas) kpiContasVencidas.textContent = formatCurrency(kpiData.totalVencido);
    
    // Popula os campos existentes
    document.getElementById('kpiTotalMes').textContent = formatCurrency(kpiData.totalMes);
    document.getElementById('kpiPagoMes').textContent = formatCurrency(kpiData.pagoMes);
    document.getElementById('kpiPendenteMes').textContent = formatCurrency(pendenteMes);
}

/**
 * Função principal que busca todos os dados e orquestra a renderização do dashboard.
 */
async function renderDashboard() {
    showLoader();
    try {
        const dateRange = getDateRangeFromPreset();

        // ATUALIZADO: Passa o 'dashboardStatusFilter' para as chamadas da API
        const [pieData, barData, kpiData, upcomingData] = await Promise.all([
            api.getExpensesByCategory(dateRange, dashboardStatusFilter),
            api.getMonthlySummary(dateRange, dashboardStatusFilter),
            api.getKpiSummary(dateRange),
            api.getUpcomingPayments()
        ]);

        updateKpiCards(kpiData);
        renderPieChart(pieData);
        renderBarChart(barData);
        renderUpcomingPayments(upcomingData);
        renderTopExpensesChart(pieData);

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Renderiza o gráfico de pizza de despesas por categoria.
 */
function renderPieChart(data) {
    const canvas = document.getElementById('expensesByCategoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (expensesPieChart) {
        expensesPieChart.destroy();
    }

    expensesPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(item => item.categoryName),
            datasets: [{
                data: data.map(item => item.totalAmount),
                backgroundColor: ['#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'],
                borderColor: '#1f2937',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: '#d1d5db' } } }
        }
    });
}

/**
 * Renderiza o gráfico de barras com o resumo dos últimos meses.
 */
function renderBarChart(data) {
    const canvas = document.getElementById('monthlyExpensesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const labels = data.map(item => `${monthNames[item._id.month - 1]}/${String(item._id.year).slice(2)}`);
    const values = data.map(item => item.totalAmount);

    if (expensesBarChart) {
        expensesBarChart.destroy();
    }
    
    expensesBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total',
                data: values,
                backgroundColor: 'rgba(79, 70, 229, 0.6)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

/**
 * Busca categorias da API e preenche um elemento <select> do HTML.
 * @param {HTMLSelectElement} selectElement - O elemento dropdown a ser preenchido.
 */
async function populateCategorySelect(selectElement) {
    if (!selectElement) return;

    try {
        const categories = await api.getCategories();
        selectElement.innerHTML = '<option value="">Nenhuma</option>'; // Opção padrão
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category._id;
            option.textContent = category.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        showToast('Erro ao carregar categorias.', 'error');
    }
}

/**
 * Inicializa a funcionalidade de arrastar e soltar para os cartões do dashboard
 * e salva a nova ordem no localStorage. (VERSÃO CORRIGIDA)
 */
function initializeDashboardDragAndDrop() {
    // Mesma verificação de tela
    if (window.innerWidth < 1024) {
        return;
    }
    
    const kpiGrid = document.getElementById('dashboard-kpi-grid');
    const mainGrid = document.getElementById('dashboard-main-grid');

    let kpiSortable, mainSortable;

    const saveOrder = (gridType) => {
        if (!currentLoggedInUser || !currentLoggedInUser._id) return;

        const key = `dashboardOrder_${gridType}_${currentLoggedInUser._id}`;
        let order;

        if (gridType === 'kpi' && kpiSortable) {
            order = kpiSortable.toArray();
        } else if (gridType === 'main' && mainSortable) {
            order = mainSortable.toArray();
        }

        if (order) {
            localStorage.setItem(key, JSON.stringify(order));
        }
    };

    if (kpiGrid) {
        kpiSortable = new Sortable(kpiGrid, {
            animation: 150,
            ghostClass: 'opacity-50',
            onEnd: () => saveOrder('kpi'),
        });
    }

    if (mainGrid) {
        mainSortable = new Sortable(mainGrid, {
            animation: 150,
            ghostClass: 'opacity-50',
            onEnd: () => saveOrder('main'),
        });
    }
}

/**
 * Verifica o localStorage por uma ordem de cartões salva para o utilizador atual
 * e, se encontrar, reordena os elementos no ecrã.
 */
function applySavedDashboardOrder() {
    if (!currentLoggedInUser || !currentLoggedInUser._id) return;

    const applyOrder = (gridType) => {
        const key = `dashboardOrder_${gridType}_${currentLoggedInUser._id}`;
        const savedOrder = localStorage.getItem(key);
        const grid = document.getElementById(`dashboard-${gridType}-grid`);

        if (savedOrder && grid) {
            const order = JSON.parse(savedOrder);
            // Para cada id na ordem salva, encontramos o elemento correspondente
            // e o movemos para o final do container. Ao fazer isto em sequência,
            // a ordem final corresponde à ordem salva.
            order.forEach(dataId => {
                const card = grid.querySelector(`[data-id="${dataId}"]`);
                if (card) {
                    grid.appendChild(card);
                }
            });
        }
    };

    applyOrder('kpi');
    applyOrder('main');
}

/**
 * Captura a área do dashboard como uma imagem e gera um ficheiro PDF para download.
 */
async function handleVisualExportPDF() {
    // Mostra o loader para dar feedback ao utilizador
    showLoader();

    // Seleciona o elemento do DOM que queremos "fotografar"
    const dashboardElement = document.getElementById('dashboardView');
    
    // Esconde temporariamente os botões de filtro e exportação para não aparecerem no PDF
    const filterContainer = document.getElementById('dashboard-date-filter-container');
    if (filterContainer) filterContainer.style.display = 'none';

    try {
        // Usa a biblioteca html2canvas para criar um "canvas" (uma imagem) do elemento
        const canvas = await html2canvas(dashboardElement, {
            scale: 2, // Aumenta a resolução da imagem para melhor qualidade
            backgroundColor: '#1e293b' // Garante um fundo consistente
        });

        // Converte o canvas para uma imagem no formato PNG
        const imageData = canvas.toDataURL('image/png');

        // Usa a biblioteca jsPDF para criar o documento
        // A orientação 'p' é retrato (portrait), 'mm' é milímetros, 'a4' é o tamanho da página
        const pdf = new jspdf.jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // Calcula as dimensões da imagem para que ela caiba na página A4, mantendo a proporção
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imageWidth = canvas.width;
        const imageHeight = canvas.height;
        const ratio = imageWidth / imageHeight;
        let pdfImageWidth = pageWidth - 20; // Deixa uma margem de 10mm de cada lado
        let pdfImageHeight = pdfImageWidth / ratio;
        
        // Se a imagem ainda for muito alta, ajusta pela altura
        if (pdfImageHeight > pageHeight - 20) {
            pdfImageHeight = pageHeight - 20;
            pdfImageWidth = pdfImageHeight * ratio;
        }
        
        // Adiciona a imagem ao PDF, centralizada
        const x = (pageWidth - pdfImageWidth) / 2;
        const y = 10; // Margem de 10mm no topo
        pdf.addImage(imageData, 'PNG', x, y, pdfImageWidth, pdfImageHeight);

        // Força o download do ficheiro
        pdf.save('dashboard-relatorio.pdf');

    } catch (error) {
        console.error("Erro ao gerar PDF visual:", error);
        showToast('Ocorreu um erro ao gerar o PDF.', 'error');
    } finally {
        // Mostra novamente os botões de filtro, quer a exportação tenha funcionado ou não
        if (filterContainer) filterContainer.style.display = 'block';
        // Esconde o loader
        hideLoader();
    }
}

/**
 * Alterna a visualização no modal de adicionar boleto entre o modo manual e o de importação de XML.
 * @param {string} mode - O modo a ser ativado ('manual' ou 'xml').
 */
function switchAddBillMode(mode) {
    if (!manualAddForm || !xmlAddForm || !csvImportForm || !recurrentAddForm) return;

    // Esconde todos os painéis
    manualAddForm.classList.add('hidden');
    xmlAddForm.classList.add('hidden');
    csvImportForm.classList.add('hidden');
    recurrentAddForm.classList.add('hidden'); // Esconde o novo painel

    // Reseta o estilo de todos os botões
    [manualAddBtn, xmlAddBtn, csvImportBtn, recurrentAddBtn].forEach(btn => { // Adiciona o novo botão
        if(btn) {
            btn.classList.add('text-gray-400', 'hover:bg-gray-800');
            btn.classList.remove('bg-indigo-600', 'border-gray-700', 'border-b-0', '-mb-px', 'text-white');
        }
    });

    // Ativa o painel e o botão corretos
    let activeBtn, activeForm;
    if (mode === 'manual') {
        activeBtn = manualAddBtn;
        activeForm = manualAddForm;
    } else if (mode === 'xml') {
        activeBtn = xmlAddBtn;
        activeForm = xmlAddForm;
    } else if (mode === 'recurrent') { // Adiciona a nova condição
        activeBtn = recurrentAddBtn;
        activeForm = recurrentAddForm;
    } else if (mode === 'csv') {
        activeBtn = csvImportBtn;
        activeForm = csvImportForm;
    }

    if (activeBtn && activeForm) {
        activeForm.classList.remove('hidden');
        activeBtn.classList.add('bg-indigo-600', 'border-gray-700', 'border-b-0', '-mb-px', 'text-white');
        activeBtn.classList.remove('text-gray-400', 'hover:bg-gray-800');
    }
}

/**
 * Lida com a seleção de um ficheiro CSV, lê e pré-visualiza os dados.
 */
function handleCsvFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Usa o PapaParse para ler o ficheiro
    Papa.parse(file, {
        header: true, // Trata a primeira linha como cabeçalho
        skipEmptyLines: true,
        complete: (results) => {
            // Guarda os dados processados no estado da aplicação
            parsedCsvData = results.data;
            renderCsvPreview(parsedCsvData);
        },
        error: (err) => {
            showToast(`Erro ao ler o ficheiro CSV: ${err.message}`, 'error');
        }
    });
}

/**
 * Renderiza a tabela de pré-visualização com os dados lidos do CSV.
 */
function renderCsvPreview(data) {
    // Verificação de segurança para garantir que 'data' é um array
    if (!Array.isArray(data)) {
        console.error("renderCsvPreview foi chamada com dados inválidos:", data);
        data = []; // Assume um array vazio para não quebrar a execução
    }

    if (!csvPreviewTableBody || !csvPreviewArea || !csvImportSummary) {
        console.error("Elementos da pré-visualização do CSV não foram encontrados no HTML.");
        return;
    }

    csvPreviewTableBody.innerHTML = '';
    if (data.length === 0) {
        csvPreviewArea.classList.add('hidden');
        return;
    }
    
    const formatCurrency = (valueStr) => {
        const value = parseFloat(String(valueStr).replace(',', '.'));
        return isNaN(value) ? 'Inválido' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    data.forEach(row => {
        const values = Object.values(row);
        const tr = `
            <tr>
                <td class="px-4 py-2 border-b border-gray-700">${values[0] || ''}</td>
                <td class="px-4 py-2 border-b border-gray-700">${values[1] || ''}</td>
                <td class="px-4 py-2 border-b border-gray-700">${values[2] || ''}</td>
                <td class="px-4 py-2 border-b border-gray-700 text-right">${formatCurrency(values[3])}</td>
            </tr>
        `;
        csvPreviewTableBody.insertAdjacentHTML('beforeend', tr);
    });

    csvImportSummary.textContent = `${data.length} boletos prontos para serem importados.`;
    csvPreviewArea.classList.remove('hidden');
}

/**
 * Envia os dados do CSV para a API para serem salvos na base de dados.
 */
async function handleConfirmImport() {
    if (parsedCsvData.length === 0) {
        return showToast('Não há dados para importar.', 'info');
    }
    showLoader();
    try {
        const response = await api.importBoletos(parsedCsvData);
        showToast(response.message, 'success');

        // Fecha o modal e atualiza a aplicação
        addBillModal.classList.add('hidden');
        await updateBillsOrganizer();

        // Limpa os dados da pré-visualização
        csvPreviewArea.classList.add('hidden');
        csvFileInput.value = '';
        parsedCsvData = [];

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Atualiza a visibilidade e a contagem do botão de pagamento em massa.
 */
function updateMassPaymentButton() {
    const count = selectedItems.size;
    selectedCountSpan.textContent = count;
    massActionsContainer.classList.toggle('hidden', count === 0);
}

/**
 * Lida com o clique no botão "Pagar Selecionados".
 */
async function handleMarkSelectedAsPaid() {
    if (selectedItems.size === 0) {
        return showToast('Nenhuma parcela selecionada.', 'info');
    }

    if (!confirm(`Tem a certeza que deseja marcar ${selectedItems.size} parcela(s) como paga(s)?`)) {
        return;
    }

    showLoader();
    try {
        const parcelIds = Array.from(selectedItems.keys());

        // Chama a função da API com o array de IDs correto.
        const response = await api.markParcelsAsPaid(parcelIds);

        showToast(response.message, 'success');

        // Limpa a seleção e atualiza a interface
        selectedItems.clear();
        updateMassPaymentButton();
        await updateBillsOrganizer(); // Recarrega o calendário

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Seleciona todos os checkboxes de boletos visíveis no calendário.
 */
function handleSelectAllVisible() {
    // Pega todos os checkboxes que estão atualmente no calendário
    document.querySelectorAll('.mass-payment-checkbox').forEach(checkbox => {
        // Marca apenas os que ainda não estão marcados
        if (!checkbox.checked) {
            checkbox.checked = true;

            // --- LÓGICA CORRIGIDA ---
            const parcelId = checkbox.dataset.parcelId;
            // Pega o boletoId do elemento pai mais próximo
            const boletoId = checkbox.closest('.bill-card-draggable').dataset.boletoId;

            // Garante que temos os dois IDs antes de adicionar ao mapa
            if (parcelId && boletoId) {
                // Usa o método .set(key, value), que é o correto para um Map
                selectedItems.set(parcelId, boletoId);
            }
        }
    });
    // Atualiza o botão para refletir a nova contagem
    updateMassPaymentButton();
}

/**
 * Desmarca todos os checkboxes de boletos selecionados.
 */
function handleDeselectAll() {
    // Limpa o nosso Set de seleção
    selectedItems.clear();
    // Desmarca todos os checkboxes que estão no calendário
    document.querySelectorAll('.mass-payment-checkbox:checked').forEach(checkbox => {
        checkbox.checked = false;
    });
    // Atualiza o botão (que será escondido, pois a contagem é 0)
    updateMassPaymentButton();
}

/**
 * Busca os dados do utilizador e abre o modal de perfil.
 */
async function openProfileModal() {
    // Usa as variáveis globais que já temos da inicialização
    if (!currentLoggedInUser || !currentLoggedInCompany) {
        showToast('Não foi possível carregar os dados do perfil.', 'error');
        return;
    }

    // Preenche o modal com os dados
    profileUsername.textContent = currentLoggedInUser.username;
    profileRole.textContent = currentLoggedInUser.role;
    profileCompany.textContent = currentLoggedInCompany.nomeEmpresa;

    // Mostra o modal
    profileModal.classList.remove('hidden');
}

/**
 * Busca o anúncio ativo mais recente e o exibe no banner.
 */
async function fetchAndDisplayAnnouncement() {
    showLoader();
    try {
        const announcement = await api.getActiveAnnouncement();

        // Se existir um anúncio e ele tiver uma mensagem
        if (announcement && announcement.message) {
            let messageHtml = announcement.message;
            // Se o anúncio tiver um link, transforma a mensagem num link clicável
            if (announcement.link) {
                messageHtml = `<a href="${announcement.link}" target="_blank" class="hover:underline">${announcement.message} <i class="fas fa-external-link-alt fa-xs ml-1"></i></a>`;
            }
            announcementMessage.innerHTML = messageHtml;
            globalAnnouncementBanner.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Não foi possível buscar o anúncio:", error);
    } finally {
        hideLoader();
    }
}

/**
 * Renderiza a visualização de lista diária para dispositivos móveis.
 * @param {Array} boletosToRender - A lista de boletos a ser usada para a renderização.
 * @param {string|null} slideDirection - A direção do swipe ('left' ou 'right') para aplicar a animação de entrada correta.
 */
function renderDailyView(boletosToRender = userBoletos, slideDirection = null) {
    const dailyViewContainer = document.getElementById('dailyBillsViewer');
    if (!dailyViewContainer || dailyViewContainer.offsetParent === null) {
        return;
    }

    const listContainer = document.getElementById('dailyBillsList');
    const dateDisplay = document.getElementById('currentDailyDate');

    if (!listContainer || !dateDisplay) {
        return;
    }

    dateDisplay.textContent = currentDailyViewDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
    });

    const dateStr = currentDailyViewDate.toISOString().split('T')[0];
    const parcelsForDay = boletosToRender
        .flatMap(bill => bill.parcels.map(parcel => ({ ...parcel, parentBill: bill })))
        .filter(parcel => parcel.dueDate === dateStr);

    // Limpa de forma direta todos os boletos antigos E a mensagem "Nenhum boleto".
    listContainer.innerHTML = '';

    // Adiciona a animação de entrada se uma direção foi fornecida
    if (slideDirection) {
        const animationClass = slideDirection === 'right' ? 'slide-in-from-left' : 'slide-in-from-right';
        listContainer.classList.add(animationClass);

        // Remove a classe após a animação para não interferir em futuros swipes
        listContainer.addEventListener('animationend', () => {
            listContainer.classList.remove(animationClass);
        }, { once: true });
    }


    if (parcelsForDay.length === 0) {
        // Se não houver parcelas, recria e exibe a mensagem de "Nenhum boleto".
        const noBillsMessage = document.createElement('div');
        noBillsMessage.id = 'noDailyBills';
        noBillsMessage.className = 'text-center text-gray-400 py-4';
        noBillsMessage.textContent = 'Nenhum boleto encontrado para este dia/filtro.';
        listContainer.appendChild(noBillsMessage);
    } else {
        // Se houver parcelas, começa a criar e adicionar os novos elementos.
        parcelsForDay.forEach(parcel => {
            const bill = parcel.parentBill;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(parcel.dueDate + 'T00:00:00');
            const isOverdue = !parcel.paid && dueDate < today;
            let statusClass = 'border-l-4 border-indigo-500';

            if (parcel.paid) {
                statusClass = 'border-l-4 border-green-500';
            } else if (isOverdue) {
                statusClass = 'border-l-4 border-red-500';
            }

            const containerDiv = document.createElement('div');
            containerDiv.className = `bg-gray-700/50 p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-700 ${statusClass}`;
            containerDiv.addEventListener('click', () => openBillModal(bill, parcel));

            const leftDiv = document.createElement('div');
            leftDiv.className = 'flex-1 min-w-0';
            const nameP = document.createElement('p');
            nameP.className = 'text-white font-semibold truncate';
            nameP.textContent = `${bill.name} (${parcel.number}ª)`;
            const categoryP = document.createElement('p');
            categoryP.className = 'text-sm text-gray-400';
            categoryP.textContent = bill.category ? bill.category.name : 'Sem Categoria';
            leftDiv.appendChild(nameP);
            leftDiv.appendChild(categoryP);

            const rightDiv = document.createElement('div');
            rightDiv.className = 'text-right ml-4';
            const amountP = document.createElement('p');
            amountP.className = 'text-lg font-bold text-white';
            amountP.textContent = parcel.amount.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            const statusP = document.createElement('p');
            statusP.className = `text-xs ${parcel.paid ? 'text-green-400' : isOverdue ? 'text-red-400' : 'text-yellow-400'}`;
            statusP.textContent = parcel.paid ? 'Pago' : isOverdue ? 'Vencido' : 'A Pagar';
            rightDiv.appendChild(amountP);
            rightDiv.appendChild(statusP);
            
            containerDiv.appendChild(leftDiv);
            containerDiv.appendChild(rightDiv);

            listContainer.appendChild(containerDiv);
        });
    }
}

// =================================================================================
// =================================================================================
// EVENT HANDLERS - Funções que respondem aos eventos
// =================================================================================
// =================================================================================

async function handleForgotPasswordRequest(e) {
    e.preventDefault();
    const email = document.getElementById('recoveryEmailInput').value;
    showLoader();
    try {
        const data = await api.requestPasswordReset(email);
        showToast(data.message, 'success'); // Mostra a mensagem genérica de sucesso
        forgotPasswordModal.classList.add('hidden');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}



async function handleCalculateInstallments(e) {
    e.preventDefault(); // Impede a submissão padrão do formulário

    const activeTabButton = document.querySelector('#addBillModal .flex button.bg-indigo-600');
    if (!activeTabButton) {
        return showToast('Erro: Não foi possível identificar a aba ativa.', 'error');
    }
    const activeModeId = activeTabButton.id;

    currentBill = null;

    if (activeModeId === 'manual-add-btn') {
        const billName = document.getElementById('billName').value;
        const dueDate = document.getElementById('dueDate').value;
        const totalAmount = parseFloat(document.getElementById('totalAmount').value.replace(',', '.'));
        const installments = parseInt(document.getElementById('installments').value);
        const spacingDays = parseInt(document.getElementById('spacingDays').value) || 30;
        const description = document.getElementById('description').value;

        // Validação feita aqui no JavaScript
        if (!billName || !dueDate || !installments || isNaN(totalAmount) || totalAmount <= 0 || installments <= 0) {
            return showToast("Preencha todos os campos obrigatórios com valores válidos.", "error");
        }

        currentBill = { name: billName, description, parcels: [], category: null };
        const parcelAmount = parseFloat((totalAmount / installments).toFixed(2));

        for (let i = 0; i < installments; i++) {
            const parcelDate = new Date(dueDate + 'T00:00:00');
            parcelDate.setDate(parcelDate.getDate() + (i * spacingDays));
            currentBill.parcels.push({ number: i + 1, amount: parcelAmount, dueDate: parcelDate.toISOString().split('T')[0], barcode: '' });
        }

    } else if (activeModeId === 'recurrent-add-btn') {
        const billName = document.getElementById('recurrentBillName').value;
        const startDate = document.getElementById('recurrentStartDate').value;
        const amount = parseFloat(document.getElementById('recurrentAmount').value);
        const months = parseInt(document.getElementById('recurrentInstallments').value);
        const description = document.getElementById('recurrentDescription').value;

        // Validação feita aqui no JavaScript
        if (!billName || !startDate || !months || isNaN(amount) || amount <= 0 || months <= 0) {
            return showToast("Preencha todos os campos do pagamento recorrente.", "error");
        }

        currentBill = { name: billName, description, parcels: [], category: null };

        for (let i = 0; i < months; i++) {
            const parcelDate = new Date(startDate + 'T00:00:00');
            parcelDate.setMonth(parcelDate.getMonth() + i);
            currentBill.parcels.push({ number: i + 1, amount: amount, dueDate: parcelDate.toISOString().split('T')[0], barcode: '' });
        }
    }

    // Este bloco só será executado se `currentBill` tiver sido preenchido com sucesso
    if (currentBill && currentBill.parcels.length > 0) {
        installmentsList.innerHTML = '';
        currentBill.parcels.forEach((parcel, index) => {
             installmentsList.insertAdjacentHTML('beforeend', `
                <div class="grid grid-cols-12 gap-4 items-center bg-gray-700/50 p-2 rounded-md">
                    <div class="col-span-1"><span class="font-medium text-gray-200">Parcela ${parcel.number}</span></div>
                    <div class="col-span-2"><input type="date" class="parcel-date-input bg-gray-600 text-white p-2 rounded text-sm w-full" value="${parcel.dueDate}" data-parcel-index="${index}"></div>
                    <div class="col-span-2"><input type="number" step="0.01" class="parcel-amount-input bg-gray-600 text-white p-2 rounded w-full text-right font-bold" value="${parcel.amount.toFixed(2)}" data-parcel-index="${index}"></div>
                    <div class="col-span-7"><input type="text" class="parcel-barcode-input bg-gray-600 text-white p-2 rounded text-sm w-full" placeholder="Insira o código de barras da parcela" value="" data-parcel-index="${index}"></div>
                </div>
            `);
        });

        addEventListenersToInstallmentInputs();
        updatePreviewTotal();
        previewBillNameInput.value = currentBill.name;
        previewNfeNumber.textContent = 'N/A';
        addBillModal.classList.add('hidden');
        await populateCategorySelect(document.getElementById('previewBillCategorySelect'));
        installmentsPreviewModal.classList.remove('hidden');
    }
}

/**
 * Recalcula e atualiza o valor total na pré-visualização das parcelas.
 */
function updatePreviewTotal() {
    if (!currentBill.parcels) return;
    const total = currentBill.parcels.reduce((sum, parcel) => sum + parcel.amount, 0);
    parcelPreviewTotalSpan.textContent = `Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
}

async function handleAddToOrganizer() {
    currentBill.category = document.getElementById('previewBillCategorySelect').value || null;

    showLoader();
    try {
        await api.createBoleto(currentBill); // O objeto currentBill agora tem a categoria correta
        showToast('Boleto criado com sucesso!', 'success');
        installmentsPreviewModal.classList.add('hidden');
        clearBillForm();
        await updateBillsOrganizer();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

async function handleSaveChanges() {
    if (!selectedParcel) return;

    // Guarda os dados atualizados do formulário
    const updatedParcelData = {
        paid: modalBillPaidCheckbox.checked,
        amount: parseFloat(modalBillAmount.value),
        dueDate: modalBillDate.value,
        description: modalBillDescription.value,
        barcode: modalBillBarcodeInput.value,
    };
    const updatedBillData = {
        category: modalBillCategorySelect.value || null
    };

    // Encontra o boleto pai na nossa lista local
    const parentBoleto = userBoletos.find(b => b._id === selectedParcel.parentId);

    // Verifica se a parcela é recorrente (se o boleto pai tem mais de 1 parcela)
    if (parentBoleto && parentBoleto.parcels.length > 1) {
        // Se for recorrente, guarda os dados e abre o modal de escolha
        pendingUpdateData = { updatedParcelData, updatedBillData };

        // Atualiza a data no texto do botão para dar mais contexto ao utilizador
        const date = new Date(updatedParcelData.dueDate + 'T00:00:00');
        singleParcelDate.textContent = date.toLocaleDateString('pt-BR');

        recurrentEditModal.classList.remove('hidden');
    } else {
        // Se não for recorrente, salva diretamente como antes
        showLoader();
        try {
            await api.updateParcel(selectedParcel.parentId, selectedParcel._id, updatedParcelData);
            await api.updateBoleto(selectedParcel.parentId, updatedBillData);
            showToast('Alterações salvas com sucesso!', 'success');
            billModal.classList.add('hidden');
            await updateBillsOrganizer();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoader();
        }
    }
}

async function handleDeleteParcel() {
    if (!selectedParcel || !confirm("Tem certeza que deseja excluir APENAS esta parcela?")) return;
    showLoader();
    try {
        await api.deleteParcel(selectedParcel.parentId, selectedParcel._id);
        showToast('Parcela excluída com sucesso!', 'success');
        billModal.classList.add('hidden');
        await updateBillsOrganizer();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

async function handleDeleteEntireBill() {
    if (!selectedParcel || !confirm("Tem certeza que deseja excluir o boleto INTEIRO e TODAS as suas parcelas?")) return;
    showLoader();
    try {
        await api.deleteBoleto(selectedParcel.parentId);
        showToast('Boleto completo excluído com sucesso!', 'success');
        billModal.classList.add('hidden');

        await updateBillsOrganizer();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Função de inicialização principal da aplicação.
 * Verifica a sessão e o estado da assinatura.
 */
async function initializeApp() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();

    const token = localStorage.getItem('authToken');
    if (!token) {
        // Se não houver token, o utilizador não está logado.
        // Idealmente, a página de login (index.html) deveria ser mostrada.
        // Como estamos em orgboletos.html, vamos redirecionar.
        window.location.href = 'index.html';
        return;
    }

    try {
        const data = await api.checkSession();
        if (data.user && data.user.role && data.user.role.trim() === 'SuperAdmin') {
            isAdminLoggedIn = true;
            const adminModule = await import('./admin.js');
            await adminModule.showAdminDashboard(setImpersonationSession); 
        } else {
            currentLoggedInUser = data.user;
            currentLoggedInCompany = data.company;
            const subscription = currentLoggedInCompany.subscription;
            const isSubscriptionActive = subscription && subscription.status === 'active' && new Date(subscription.endDate) > new Date();

            if (isSubscriptionActive) {
                await showMainApp();
            } else {
                if (currentLoggedInUser.role === 'Proprietário') {
                    showSubscriptionModal(currentLoggedInCompany);
                } else {
                    showAccessBlockedModal();
                }
            }
        }
    } catch (error) {
        // Se o token for inválido ou a API falhar, o utilizador é deslogado
        showToast('Sua sessão expirou ou é inválida. Por favor, faça login novamente.', 'error');
        localStorage.removeItem('authToken');
        localStorage.removeItem('superAdminToken');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000); // Aguarda 2 segundos para o utilizador ler a mensagem
    } finally {
        // Esconde a tela de carregamento inicial
        document.getElementById('loadingScreen').classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('superAdminToken');
    window.location.href = 'index.html';
}

/**
 * Define a sessão de representação do admin.
 * Esta função é chamada pelo painel de admin quando clica em "Entrar".
 * VERSÃO CORRIGIDA: Agora verifica o estado da assinatura, tal como no login direto.
 * @param {object} data - Os dados recebidos da API (token, user, company).
 */
export async function setImpersonationSession(data) {
    try {
        localStorage.setItem('superAdminToken', localStorage.getItem('authToken'));
        localStorage.setItem('authToken', data.token);

        currentLoggedInCompany = data.company;
        currentLoggedInUser = data.user;
        loggedInViaAdmin = true; // Esta variável é a chave!

        const subscription = currentLoggedInCompany.subscription;

        // A lógica de verificação de data que corrigimos anteriormente
        let endDate = null;
        if (subscription && subscription.endDate) {
            endDate = new Date(subscription.endDate);
            endDate.setHours(23, 59, 59, 999);
        }

        const isSubscriptionActive = subscription &&
                                     subscription.status === 'active' &&
                                     endDate &&
                                     endDate > new Date();

        // --- INÍCIO DA ALTERAÇÃO ---

        // A condição agora é: A assinatura está ativa OU é um admin a entrar?
        if (isSubscriptionActive || loggedInViaAdmin) {
            // Se qualquer uma das condições for verdadeira, mostra a aplicação.
            await showMainApp();

        // --- FIM DA ALTERAÇÃO ---
        
        } else {
            // Este bloco agora só será executado para utilizadores normais com assinaturas pendentes
            if (currentLoggedInUser.role === 'Proprietário') {
                showSubscriptionModal(currentLoggedInCompany);
            } else {
                showAccessBlockedModal();
            }
            hideLoader();
        }
    } catch (error) {
        console.error("Erro ao tentar representar o utilizador:", error);
        showToast("Ocorreu um erro ao tentar entrar na empresa.", "error");
        hideLoader();
    }
}

/**
 * Restaura a sessão original do SuperAdmin.
 * Limpa as variáveis de estado de representação e restaura o token do admin.
 * @returns {boolean} - Retorna true se o token do admin foi encontrado, senão false.
 */
export function restoreAdminSession() {
    const adminToken = localStorage.getItem('superAdminToken');
    if (!adminToken) {
        console.error("Token de superAdmin não encontrado para restaurar a sessão.");
        return false;
    }

    localStorage.setItem('authToken', adminToken);
    localStorage.removeItem('superAdminToken');

    // Redefine as variáveis de estado da aplicação para o modo admin
    currentLoggedInUser = null;
    currentLoggedInCompany = null;
    loggedInViaAdmin = false;
    isAdminLoggedIn = true;

    return true;
}



/**
 * Lida com o upload de um ficheiro XML de NFe, lê os dados e preenche o formulário
 * ou vai direto para a pré-visualização se as parcelas estiverem definidas.
 * @param {Event} event - O evento 'change' do input do ficheiro.
 */
async function handleNfeXmlUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const xmlString = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");

            if (xmlDoc.getElementsByTagName("nfeProc").length === 0) {
                throw new Error("O ficheiro fornecido não parece ser um XML de NFe válido.");
            }

            const emitenteNode = xmlDoc.getElementsByTagName("emit")[0];
            const ideNode = xmlDoc.getElementsByTagName("ide")[0];
            const totalNode = xmlDoc.getElementsByTagName("ICMSTot")[0];

            const nomeFornecedor = getTagValue("xNome", emitenteNode);
            const nfeNumber = getTagValue("nNF", ideNode);
            const duplicatas = Array.from(xmlDoc.getElementsByTagName("dup"));

            let parcelsData = [];

            if (duplicatas.length > 0) {
                parcelsData = duplicatas.map((dup, i) => ({
                    number: parseInt(getTagValue("nDup", dup)) || (i + 1),
                    amount: parseFloat(getTagValue("vDup", dup)) || 0,
                    dueDate: getTagValue("dVenc", dup)
                }));
            } else {
                const infoCpl = getTagValue("infCpl", xmlDoc);
                const cobrancaMatch = infoCpl.match(/BOLETO:\s*([\d\/\s]+)/i);

                if (cobrancaMatch && cobrancaMatch[1]) {
                    const dias = cobrancaMatch[1].trim().split(/[/\s]+/);
                    const totalAmount = parseFloat(getTagValue("vNF", totalNode));
                    const parcelAmount = parseFloat((totalAmount / dias.length).toFixed(2));
                    const dataEmissao = new Date(getTagValue("dhEmi", ideNode));

                    parcelsData = dias.map((dia, i) => {
                        const vencimento = new Date(dataEmissao);
                        vencimento.setDate(vencimento.getDate() + parseInt(dia));
                        return {
                            number: i + 1,
                            amount: parcelAmount,
                            dueDate: vencimento.toISOString().split('T')[0]
                        };
                    });
                }
            }

            if (parcelsData.length > 0) {
                // ALTERAÇÃO AQUI: Removemos o prefixo "NFe - " do nome.
                currentBill = { name: nomeFornecedor, nfeNumber: nfeNumber, parcels: parcelsData };

                installmentsList.innerHTML = '';
                currentBill.parcels.forEach((parcel, index) => {
                    installmentsList.insertAdjacentHTML('beforeend', `
                        <div class="grid grid-cols-12 gap-4 items-center bg-gray-700/50 p-2 rounded-md">
                            <div class="col-span-1"><span class="font-medium text-gray-200">Parcela ${parcel.number}</span></div>
                            <div class="col-span-2"><input type="date" class="parcel-date-input bg-gray-600 text-white p-2 rounded text-sm w-full" value="${parcel.dueDate}" data-parcel-index="${index}"></div>
                            <div class="col-span-2"><input type="number" step="0.01" class="parcel-amount-input bg-gray-600 text-white p-2 rounded w-full text-right font-bold" value="${parcel.amount.toFixed(2)}" data-parcel-index="${index}"></div>
                            <div class="col-span-7"><input type="text" class="parcel-barcode-input bg-gray-600 text-white p-2 rounded text-sm w-full" placeholder="Insira o código de barras da parcela" value="" data-parcel-index="${index}"></div>
                        </div>
                    `);
                });

                addEventListenersToInstallmentInputs();
                updatePreviewTotal();
                previewBillNameInput.value = currentBill.name;
                previewNfeNumber.textContent = nfeNumber;
                await populateCategorySelect(document.getElementById('previewBillCategorySelect'));
                installmentsPreviewModal.classList.remove('hidden');

            } else {
                const valorNFe = getTagValue("vNF", totalNode);
                const vencimento = getTagValue("dhEmi", ideNode).split('T')[0];

                // ALTERAÇÃO AQUI TAMBÉM: Removemos o prefixo no caso de fallback.
                document.getElementById('billName').value = nomeFornecedor;
                document.getElementById('totalAmount').value = parseFloat(valorNFe).toFixed(2);
                if (vencimento) {
                    document.getElementById('dueDate').value = vencimento;
                }

                addBillModal.classList.remove('hidden');
            }

            showToast('Dados do XML carregados com sucesso!', 'success');

        } catch (error) {
            showToast(error.message, 'error');
            console.error("Erro ao processar XML:", error);
        } finally {
            event.target.value = '';
        }
    };

    reader.onerror = () => {
        showToast('Não foi possível ler o ficheiro selecionado.', 'error');
    };

    reader.readAsText(file);
}

/**
 * Adiciona todos os eventos necessários aos inputs da lista de parcelas.
 */
function addEventListenersToInstallmentInputs() {
    // Listener para o campo de VALOR
    document.querySelectorAll('.parcel-amount-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.parcelIndex);
            if (currentBill.parcels[index]) {
                currentBill.parcels[index].amount = parseFloat(e.target.value) || 0;
            }
            updatePreviewTotal();
        });
    });

    // Listener para o campo de DATA
    document.querySelectorAll('.parcel-date-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.parcelIndex);
            if (currentBill.parcels[index]) {
                currentBill.parcels[index].dueDate = e.target.value;
            }
        });
    });

    /**
     * Mostra a tela de login de administrador.
     */
    function showAdminLogin() {
        hideAllScreens(); // Função de utils.js
        if (adminLoginForm) adminLoginForm.reset();
        if (adminLoginScreen) adminLoginScreen.classList.remove('hidden');
    }

    // Listener para o campo de CÓDIGO DE BARRAS
    document.querySelectorAll('.parcel-barcode-input').forEach(input => {
        // Evento para guardar o valor quando é digitado
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.parcelIndex);
            if (currentBill.parcels[index]) {
                currentBill.parcels[index].barcode = e.target.value;
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Impede que o 'Enter' submeta um formulário ou quebre a linha

                const currentIndex = parseInt(e.target.dataset.parcelIndex);
                const nextIndex = currentIndex + 1;
                const nextInput = document.querySelector(`.parcel-barcode-input[data-parcel-index="${nextIndex}"]`);

                if (nextInput) {
                    // Se houver um próximo campo de código de barras, foca nele.
                    nextInput.focus();
                    nextInput.select(); // Seleciona todo o texto para facilitar a substituição
                } else {
                    // Se for o último campo, foca no botão de salvar.
                    document.getElementById('addToOrganizer').focus();
                }
            }
        });
    });
}

/**
 * Lida com o clique no botão para mostrar o código de barras em ecrã inteiro.
 */
function handleShowFullScreenBarcode() {
    const barcodeValue = modalBillBarcodeInput.value;
    if (!barcodeValue) {
        return showToast('Não há código de barras para mostrar.', 'info');
    }

    const barcodeImageContainer = document.getElementById('fullScreenBarcodeImage');
    if (!barcodeImageContainer) return;

    // Limpa qualquer código de barras anterior
    barcodeImageContainer.innerHTML = '';

    try {
        // Limpa o valor, removendo tudo o que não for número, para garantir a compatibilidade.
        const cleanBarcode = barcodeValue.replace(/\D/g, '');

        // Usa a biblioteca JsBarcode para desenhar o código de barras
        JsBarcode(barcodeImageContainer, cleanBarcode, {
            format: "CODE128", // <-- MUDANÇA PRINCIPAL: Usamos um formato mais flexível
            lineColor: "#000000",
            width: 2,
            height: 100,
            displayValue: true, // Mostra os números abaixo das barras
            fontSize: 18
        });

        // Mostra o modal de ecrã inteiro
        barcodeFullScreenModal.classList.remove('hidden');

    } catch (e) {
        console.error("Erro ao gerar código de barras:", e);
        showToast('Erro ao gerar código de barras. Verifique se o código é válido.', 'error');
    }
}

async function handleAttachmentUpload(event) {
    const file = event.target.files[0];
    if (!file || !selectedParcel) return;

    // Cria um objeto FormData para enviar o ficheiro
    const formData = new FormData();
    formData.append('comprovante', file);

    showLoader();
    try {
        const data = await api.uploadAttachment(selectedParcel.parentId, selectedParcel._id, formData);
        showToast(data.message, 'success');

        const attachmentContainer = document.getElementById('attachment-container');

        // Substitui o input de upload pelo HTML que contém o link E o botão de remover.
        // Este é o mesmo HTML usado quando o modal é aberto pela primeira vez.
        attachmentContainer.innerHTML = `
            <div class="flex items-center justify-between">
                <a href="${data.attachmentUrl}" target="_blank" class="text-indigo-400 hover:underline flex items-center">
                    <i class="fas fa-paperclip mr-2"></i>Ver Comprovativo
                </a>
                <button id="removeAttachmentBtn" class="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700">Remover</button>
            </div>
        `;

        // IMPORTANTE: Adiciona o evento de clique ao novo botão "Remover" que acabámos de criar.
        document.getElementById('removeAttachmentBtn').addEventListener('click', handleRemoveAttachment);

        // Atualiza o nosso estado local para que a mudança persista se o modal for reaberto
        await updateBillsOrganizer();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Lida com o clique no botão para remover um anexo de comprovativo.
 * Pede confirmação, chama a API para apagar o ficheiro e atualiza a interface.
 */
async function handleRemoveAttachment() {
    // Garante que uma parcela está selecionada e pede confirmação ao utilizador
    if (!selectedParcel || !confirm("Tem a certeza que deseja remover este comprovativo? Esta ação não pode ser desfeita.")) {
        return;
    }

    showLoader(); // Mostra o ícone de carregamento
    try {
        // Chama a nossa função da API para apagar o anexo
        const data = await api.deleteAttachment(selectedParcel.parentId, selectedParcel._id);
        showToast(data.message, 'success'); // Mostra a mensagem de sucesso

        // Atualiza a interface do modal para mostrar novamente o botão de upload
        const attachmentContainer = document.getElementById('attachment-container');
        attachmentContainer.innerHTML = `<input type="file" id="attachmentUploadInput" accept=".pdf,.jpg,.jpeg,.png" class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gray-600 hover:file:bg-gray-700 cursor-pointer"/>`;

        // Adiciona o evento ao novo botão de upload que acabámos de criar
        document.getElementById('attachmentUploadInput').addEventListener('change', handleAttachmentUpload);

        // Atualiza o estado geral da aplicação para garantir que tudo fique sincronizado
        await updateBillsOrganizer();

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader(); // Esconde o ícone de carregamento, quer tenha dado erro ou não
    }
}

/**
 * Aplica o filtro e a pesquisa atuais à lista de boletos e atualiza a UI.
 * @param {string|null} slideDirection - A direção do swipe ('left' ou 'right') para passar para as funções de renderização.
 */
function applyFiltersAndSearch(slideDirection = null) {
    // 1. Obtém os valores de todos os filtros da tela
    const searchTerm = searchInput.value.toLowerCase();
    const activeStatusFilter = document.getElementById('statusFilterSelect').value;
    const selectedCategoryId = categoryFilterSelect.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Inicia o processo de filtragem em duas etapas
    const finalFilteredBoletos = userBoletos.map(bill => {
        // Etapa A: Filtra as PARCELAS dentro de cada boleto com base no STATUS
        const filteredParcels = bill.parcels.filter(parcel => {
            if (activeStatusFilter === 'all') return true;
            
            const dueDate = new Date(parcel.dueDate + 'T00:00:00');
            if (activeStatusFilter === 'paid') return parcel.paid;
            if (activeStatusFilter === 'unpaid') return !parcel.paid;
            if (activeStatusFilter === 'overdue') return !parcel.paid && dueDate < today;
            
            return false;
        });
        
        // Retorna uma cópia do boleto contendo apenas as parcelas que passaram no filtro de status
        return { ...bill, parcels: filteredParcels };

    }).filter(bill => {
        // Etapa B: Filtra a lista de BOLETOS com base nos outros critérios

        // Critério 1: O boleto deve ter sobrado com alguma parcela após o filtro de status
        if (bill.parcels.length === 0) {
            return false;
        }

        // Critério 2: O nome do boleto ou o código da NFE devem corresponder ao termo de pesquisa
        const matchesSearch = (bill.name && typeof bill.name === 'string' && bill.name.toLowerCase().includes(searchTerm)) || 
                              (bill.nfeNumber && bill.nfeNumber.includes(searchTerm));

        // Critério 3: O boleto deve corresponder à categoria selecionada
        const matchesCategory = (selectedCategoryId === 'all') || (bill.category?._id === selectedCategoryId);

        // O boleto só é mantido na lista final se passar em todos os critérios
        return matchesSearch && matchesCategory;
    });

    // 3. Envia a lista final, completamente filtrada, para as funções que desenham a tela
    renderCalendar(finalFilteredBoletos);
    renderDailyView(finalFilteredBoletos, slideDirection);
    updateMonthlySummary(finalFilteredBoletos);
}

/**
 * Inicializa a funcionalidade de arrastar e soltar (drag and drop) no calendário,
 * agora com lógica para parcelas recorrentes.
 */
function initializeDragAndDrop() {
    // Adicionamos esta condição no início da função
    // 1024px é o breakpoint 'lg' do Tailwind, onde o calendário completo aparece.
    if (window.innerWidth < 1024) {
        return; // Em telas menores que 1024px, a função para aqui e não ativa o drag-and-drop.
    }

    const dayCells = document.querySelectorAll('.day-cell-droppable');

    dayCells.forEach(cell => {
        new Sortable(cell, {
            group: 'calendar-bills',
            animation: 150,
            ghostClass: 'opacity-50',

            onEnd: async function (evt) {
                const item = evt.item;
                const toCell = evt.to;
                const boletoId = item.dataset.boletoId;
                const parcelId = item.dataset.parcelId;
                const newDate = toCell.dataset.date;

                if (!boletoId || !parcelId || !newDate) return;

                const parentBoleto = userBoletos.find(b => b._id === boletoId);
                const originalParcel = parentBoleto?.parcels.find(p => p._id === parcelId);

                if (!parentBoleto || !originalParcel) return;

                if (parentBoleto.parcels.length > 1) {
                    selectedParcel = { ...originalParcel, parentId: parentBoleto._id };

                    const updatedParcelData = {
                        ...originalParcel,
                        dueDate: newDate,
                    };

                    pendingUpdateData = { 
                        updatedParcelData, 
                        updatedBillData: { category: parentBoleto.category?._id || null }
                    };

                    const date = new Date(newDate + 'T00:00:00');
                    singleParcelDate.textContent = date.toLocaleDateString('pt-BR');

                    recurrentEditModal.classList.remove('hidden');
                    renderCalendar();

                } else {
                    showLoader();
                    try {
                        await api.updateParcel(boletoId, parcelId, { dueDate: newDate });
                        showToast('Data da parcela atualizada com sucesso!', 'success');
                        await updateBillsOrganizer();
                    } catch (error) {
                        showToast(error.message, 'error');
                        await updateBillsOrganizer();
                    } finally {
                        hideLoader();
                    }
                }
            },
        });
    });
}

/**
 * Calcula o startDate e endDate com base numa predefinição do seletor.
 * @returns {{startDate?: string, endDate?: string}} - As datas ou um objeto vazio.
 */
function getDateRangeFromPreset() {
    const preset = dateRangePresetSelect.value;
    const now = new Date();
    let startDate, endDate;

    switch (preset) {
        case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'thisQuarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            break;
        case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'custom':
            if (startDateInput.value && endDateInput.value) {
                return {
                    startDate: startDateInput.value,
                    endDate: endDateInput.value
                };
            }
            return {}; // Retorna vazio se o intervalo personalizado não estiver completo
        default:
            return {}; // Padrão sem filtro
    }

    // Formata as datas para o formato YYYY-MM-DD
    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
}

/**
 * Renderiza a lista de próximos vencimentos no dashboard.
 * @param {Array} payments - A lista de pagamentos vinda da API.
 */
function renderUpcomingPayments(payments) {
    if (!upcomingPaymentsList || !noUpcomingPaymentsMessage) return;

    upcomingPaymentsList.innerHTML = ''; // Limpa a lista

    if (payments.length === 0) {
        upcomingPaymentsList.appendChild(noUpcomingPaymentsMessage);
        noUpcomingPaymentsMessage.classList.remove('hidden');
    } else {
        noUpcomingPaymentsMessage.classList.add('hidden');
        const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        payments.forEach(payment => {
            const dueDate = new Date(payment.dueDate + 'T00:00:00');
            const formattedDate = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

            const paymentHtml = `
                <div class="flex items-center justify-between bg-gray-700/50 p-3 rounded-md">
                    <div>
                        <p class="font-medium text-white">${payment.billName} (${payment.parcelNumber}ª)</p>
                        <p class="text-sm text-gray-400">Vence em: ${formattedDate}</p>
                    </div>
                    <p class="font-semibold text-lg text-yellow-400">${formatCurrency(payment.amount)}</p>
                </div>
            `;
            upcomingPaymentsList.insertAdjacentHTML('beforeend', paymentHtml);
        });
    }
}

/**
 * Renderiza o gráfico de barras horizontais com as 5 maiores despesas por categoria.
 * @param {Array} data - Os dados de despesas vindos da API.
 */
function renderTopExpensesChart(data) {
    const canvas = document.getElementById('topExpensesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Destrói o gráfico anterior, se existir, para evitar sobreposições
    if (topExpensesChart) {
        topExpensesChart.destroy();
    }
    
    // 1. Ordena os dados do maior para o menor
    const sortedData = [...data].sort((a, b) => b.totalAmount - a.totalAmount);
    
    // 2. Pega apenas nos 5 primeiros resultados
    const top5Data = sortedData.slice(0, 5);

    // 3. Prepara os dados para o Chart.js
    const labels = top5Data.map(item => item.categoryName);
    const values = top5Data.map(item => item.totalAmount);

    topExpensesChart = new Chart(ctx, {
        type: 'bar', // Tipo de gráfico
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Gasto',
                data: values,
                backgroundColor: 'rgba(239, 68, 68, 0.6)', // Vermelho
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // <-- Isto é o que torna o gráfico horizontal!
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                y: { ticks: { color: '#d1d5db' }, grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Total: ${context.raw.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Lida com a submissão do formulário de alteração de senha.
 * @param {Event} e - O evento de submissão do formulário.
 */
async function handleChangePassword(e) {
    e.preventDefault(); // Impede o recarregamento da página

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    showLoader();
    try {
        const data = await api.changePassword({ currentPassword, newPassword, confirmPassword });
        showToast(data.message, 'success');

        // Limpa os campos e fecha o modal após o sucesso
        changePasswordForm.reset();
        profileModal.classList.add('hidden');

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoader();
    }
}


// =================================================================================
// EVENT LISTENERS - Ligamos os eventos do HTML às nossas funções
// =================================================================================


document.addEventListener('DOMContentLoaded', async () => {
// --- Lógica de inicialização que estava em initializeApp() ---
const today = new Date();
currentMonth = today.getMonth();
currentYear = today.getFullYear();
currentDailyViewDate = today;

const token = localStorage.getItem('authToken');
if (!token) {
    // Se não houver token, redireciona para a página de login
    window.location.href = 'index.html';
    return;
}

try {
    const data = await api.checkSession();
    if (data.user && data.user.role && data.user.role.trim() === 'SuperAdmin') {
        isAdminLoggedIn = true;
        const adminModule = await import('./admin.js');
        await adminModule.showAdminDashboard(setImpersonationSession);
    } else {
        currentLoggedInUser = data.user;
        currentLoggedInCompany = data.company;
        const subscription = currentLoggedInCompany.subscription;
        const isSubscriptionActive = subscription && subscription.status === 'active' && new Date(subscription.endDate) > new Date();

        if (isSubscriptionActive) {
            await showMainApp();
        } else {
            // LÓGICA DE ASSINATURA EXPIRADA / INATIVA (PREENCHIDA)
            if (currentLoggedInUser.role === 'Proprietário') {
                // Se for o dono da empresa, mostra o modal para renovar
                showSubscriptionModal(currentLoggedInCompany);
            } else {
                // Se for um funcionário/gerente, mostra o modal de acesso bloqueado
                showAccessBlockedModal();
            }
        }
    }
    } catch (error) {
        console.error("Erro original capturado:", error); // <--- ADICIONE ESTA LINHA
        // Se o token for inválido ou a API falhar, o utilizador é deslogado
        showToast('Sua sessão expirou ou é inválida. Por favor, faça login novamente.', 'error');
        localStorage.removeItem('authToken');
        localStorage.removeItem('superAdminToken');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000); 
    }  finally {
    // Esconde a tela de carregamento inicial
    document.getElementById('loadingScreen').classList.add('hidden');
}


if (logoutBtn) logoutBtn.addEventListener('click', logout);
if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', logout);
if (addToOrganizer) addToOrganizer.addEventListener('click', handleAddToOrganizer);

// Submissão de formulários
if (closeCompanyInfoModal) closeCompanyInfoModal.addEventListener('click', () => companyInfoModal.classList.add('hidden'));
if (saveCompanyInfoBtn) saveCompanyInfoBtn.addEventListener('click', handleSaveCompanyInfo);
if (closePermissionsModal) closePermissionsModal.addEventListener('click', () => permissionsModal.classList.add('hidden'));
if (savePermissionsBtn) savePermissionsBtn.addEventListener('click', handleSavePermissions);
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}
if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', logout);


// Ações na App Principal
addToOrganizer.addEventListener('click', handleAddToOrganizer);
closeAddBillModalBtn.addEventListener('click', () => addBillModal.classList.add('hidden'));

// Ações do Modal de Edição de Boleto
closeModalBtn.addEventListener('click', () => billModal.classList.add('hidden'));
saveBillBtn.addEventListener('click', handleSaveChanges);
deleteBillBtn.addEventListener('click', handleDeleteParcel);
deleteEntireBillBtn.addEventListener('click', handleDeleteEntireBill);
closeFullScreenBarcodeBtn.addEventListener('click', () => barcodeFullScreenModal.classList.add('hidden'));

// Navegação do Calendário
prevMonthBtn.addEventListener('click', () => {
    currentMonth = (currentMonth === 0) ? 11 : currentMonth - 1;
    if (currentMonth === 11) currentYear--;
    // Em vez de renderizar tudo, chamamos a função que já sabe como filtrar
    applyFiltersAndSearch(); 
});

nextMonthBtn.addEventListener('click', () => {
    currentMonth = (currentMonth === 11) ? 0 : currentMonth + 1;
    if (currentMonth === 0) currentYear++;
    // A mesma mudança aqui
    applyFiltersAndSearch(); 
});
if (addCompanyCnpjInput) {
    IMask(addCompanyCnpjInput, { mask: '00.000.000/0000-00' });
}

if (openAddBillModalBtn) {
    openAddBillModalBtn.addEventListener('click', openAddBillModal);
}

const handleRedirectToHome = () => {
    window.location.href = 'index.html';
};

const handleFullLogoutAndRedirect = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('superAdminToken');
    window.location.href = 'index.html';
};

if (subscriptionLogoutBtn) {
    subscriptionLogoutBtn.addEventListener('click', handleRedirectToHome);
}

if (blockedAccessLogoutBtn) {
    blockedAccessLogoutBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

// --- Lógica do Menu de Configurações (Engrenagem) ---
if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o clique feche o menu imediatamente
        settingsDropdown.classList.toggle('hidden');
    });
}

// Links dentro do menu dropdown
if (menuEmpresa) menuEmpresa.addEventListener('click', (e) => {
    e.preventDefault();
    settingsDropdown.classList.add('hidden');
    openCompanyInfoModal();
});

if (menuPermissoes) menuPermissoes.addEventListener('click', (e) => {
    e.preventDefault();
    settingsDropdown.classList.add('hidden');
    openPermissionsModal();
});

window.addEventListener('click', () => {
    if (settingsDropdown && !settingsDropdown.classList.contains('hidden')) {
        settingsDropdown.classList.add('hidden');
    }
});

// Link 'Gerenciar Usuários' dentro do menu dropdown
if (menuUsuarios) menuUsuarios.addEventListener('click', (e) => {
    e.preventDefault();
    settingsDropdown.classList.add('hidden');
    openManageUsersModal(currentLoggedInCompany);
});

// Botões do modal de gerir utilizadores
if (closeManageUsersModal) closeManageUsersModal.addEventListener('click', () => manageUsersModal.classList.add('hidden'));
// O botão para adicionar utilizador dentro deste modal deve abrir o outro modal
if (addCompanyUserBtn) addCompanyUserBtn.addEventListener('click', () => {
    manageUsersModal.classList.add('hidden');
    openAddUserModal(currentLoggedInCompany._id, false); 
});

/**
 * Lida com o clique no botão de criar/renovar assinatura.
 */
async function handleCreateSubscription() {
    // Desativa o botão para evitar múltiplos cliques e informa o utilizador.
    subscriptionActionBtn.disabled = true;
    subscriptionActionBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> A gerar link de pagamento...';

    try {
        // Chama a nossa função da API para obter o link do Mercado Pago.
        const data = await api.createSubscriptionLink();

        // Se a API retornar um link (init_point), redireciona o utilizador.
        if (data.init_point) {
            window.location.href = data.init_point;
        } else {
            throw new Error('Link de pagamento não recebido.');
        }
    } catch (error) {
        showToast(error.message, 'error');
        // Reativa o botão em caso de erro para que o utilizador possa tentar novamente.
        subscriptionActionBtn.disabled = false;
        subscriptionActionBtn.textContent = 'Tentar Novamente';
    }
}

// Liga a função ao clique do botão.
if (subscriptionActionBtn) {
    subscriptionActionBtn.addEventListener('click', handleCreateSubscription);
}

if (closePreviewModalBtn) {
    closePreviewModalBtn.addEventListener('click', () => {
        installmentsPreviewModal.classList.add('hidden');
    });
}

if (nfeXmlInput) {
    nfeXmlInput.addEventListener('change', handleNfeXmlUpload);
}

if (previewBillNameInput) {
    previewBillNameInput.addEventListener('input', (e) => {
        if (currentBill) {
            currentBill.name = e.target.value;
        }
    });
}

// Liga a função ao clique do botão
if (showFullScreenBarcodeBtn) {
    showFullScreenBarcodeBtn.addEventListener('click', handleShowFullScreenBarcode);
}

// Listener para o campo de pesquisa
if (searchInput) {
    searchInput.addEventListener('input', applyFiltersAndSearch);
}

// Listeners para os botões de filtro
if (filterButtons) {
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove a classe 'active' de todos os botões
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Adiciona a classe 'active' apenas ao botão clicado
            e.currentTarget.classList.add('active');
            // Aplica o filtro
            applyFiltersAndSearch();
        });
    });
}

if (menuCategorias) menuCategorias.addEventListener('click', (e) => {
    e.preventDefault();
    settingsDropdown.classList.add('hidden');
    openCategoriesModal();
});

if (closeCategoriesModal) closeCategoriesModal.addEventListener('click', () => categoriesModal.classList.add('hidden'));

if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = newCategoryNameInput.value.trim();
        if (!name) return;
        try {
            await api.createCategory(name);
            newCategoryNameInput.value = '';
            await openCategoriesModal(); // Recarrega a lista do modal
            await populateCategoryFilter(); // <-- ADICIONAMOS ESTA LINHA para atualizar o filtro
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

if (categoryListDiv) {
    categoryListDiv.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-category-btn');
        const deleteBtn = e.target.closest('.delete-category-btn');

        if (editBtn) {
            const { id, name } = editBtn.dataset;
            const newName = prompt("Editar nome da categoria:", name);
            if (newName && newName.trim() && newName.trim() !== name) {
                await api.updateCategory(id, newName.trim());
                await openCategoriesModal();
                await populateCategoryFilter();
            }
        }

        if (deleteBtn) {
            const { id } = deleteBtn.dataset;
            if (confirm("Tem a certeza que deseja apagar esta categoria?")) {
                await api.deleteCategory(id);
                await openCategoriesModal();
                await populateCategoryFilter();
            }
        }
    });
}

if (categoryFilterSelect) {
    categoryFilterSelect.addEventListener('change', applyFiltersAndSearch);
}

// Configuração dos botões do dashboard
if (viewCalendarBtn) {
    viewCalendarBtn.addEventListener('click', () => switchView('calendar'));
}
if (viewDashboardBtn) {
    viewDashboardBtn.addEventListener('click', () => switchView('dashboard'));
}

if (dateRangePresetSelect) {
    dateRangePresetSelect.addEventListener('change', () => {
        const isCustom = dateRangePresetSelect.value === 'custom';
        customDateRangeInputs.classList.toggle('hidden', !isCustom);

        // Se o utilizador selecionar uma opção que não seja "Personalizado",
        // o dashboard é atualizado imediatamente.
        if (!isCustom) {
            renderDashboard();
        }
    });
}

// Para o intervalo personalizado, atualizamos o dashboard
// assim que ambas as datas estiverem preenchidas.
if (startDateInput) {
    startDateInput.addEventListener('change', () => {
        if (endDateInput.value) renderDashboard();
    });
}
if (endDateInput) {
    endDateInput.addEventListener('change', () => {
        if (startDateInput.value) renderDashboard();
    });
}

if (viewDashboardBtn) {
    viewDashboardBtn.addEventListener('click', () => switchView('dashboard'));
}

// Listeners para os botões de exportação
const handleExport = (format) => {
    // 1. Pega no período de tempo atual do filtro do dashboard
    const dateRange = getDateRangeFromPreset();

    // 2. Constrói a query string (ex: "?startDate=2025-07-01&endDate=2025-07-31")
    const queryString = new URLSearchParams(dateRange).toString();

    // 3. Monta o URL completo para o download
    const downloadUrl = `${API_BASE_URL}/api/export/${format}?${queryString}`;
    
    // 4. Abre o URL numa nova aba, o que irá acionar o download do ficheiro
    // É importante passar o token de autenticação para a API saber quem está a pedir o ficheiro.
    fetch(downloadUrl, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
    .then(res => res.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `relatorio-despesas.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    }).catch(() => showToast('Erro ao exportar o ficheiro.', 'error'));
};

if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => handleExport('csv'));
}
if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => handleVisualExportPDF());
}

if (manualAddBtn) {
    manualAddBtn.addEventListener('click', () => switchAddBillMode('manual'));
}
if (xmlAddBtn) {
    xmlAddBtn.addEventListener('click', () => switchAddBillMode('xml'));
}

if (csvImportBtn) {
    csvImportBtn.addEventListener('click', () => switchAddBillMode('csv'));
}
if (csvFileInput) {
    csvFileInput.addEventListener('change', handleCsvFileSelect);
}
if (importCsvBtn) {
    importCsvBtn.addEventListener('click', handleConfirmImport);
}
if (markSelectedAsPaidBtn) {
    markSelectedAsPaidBtn.addEventListener('click', handleMarkSelectedAsPaid);
}
if (selectAllVisibleBtn) {
    selectAllVisibleBtn.addEventListener('click', handleSelectAllVisible);
}

if (deselectAllVisibleBtn) {
    deselectAllVisibleBtn.addEventListener('click', handleDeselectAll);
}
if (dashboardFilterButtons) {
    dashboardFilterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove a classe 'active' de todos os botões do dashboard
            dashboardFilterButtons.forEach(btn => btn.classList.remove('active'));
            // Adiciona 'active' apenas ao botão clicado
            e.currentTarget.classList.add('active');
            // Atualiza a variável de estado com o novo filtro
            dashboardStatusFilter = e.currentTarget.dataset.filter;
            // Renderiza o dashboard novamente com os dados filtrados
            renderDashboard();
        });
    });
}
// Abre o modal de alteração de categoria
if (changeCategoryBtn) {
    changeCategoryBtn.addEventListener('click', async () => {
        showLoader();
        // Popula o dropdown do modal com as categorias existentes
        await populateCategorySelect(batchCategorySelect);
        hideLoader();
        categoryBatchModal.classList.remove('hidden');
    });
}

// Botão de cancelar no modal
if (cancelCategoryBatchBtn) {
    cancelCategoryBatchBtn.addEventListener('click', () => {
        categoryBatchModal.classList.add('hidden');
    });
}

// Botão de confirmar a alteração
if (confirmCategoryBatchBtn) {
    confirmCategoryBatchBtn.addEventListener('click', async () => {
        const categoryId = batchCategorySelect.value;
        // Pega apenas os IDs únicos de boletos da nossa seleção
        const boletoIds = [...new Set(Array.from(selectedItems.values()))];

        if (boletoIds.length === 0) {
            return showToast('Nenhum item selecionado.', 'info');
        }

        showLoader();
        try {
            const response = await api.bulkUpdateCategory(boletoIds, categoryId);
            showToast(response.message, 'success');
            selectedItems.clear();
            updateMassPaymentButton();
            await updateBillsOrganizer();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            hideLoader();
            categoryBatchModal.classList.add('hidden');
        }
    });
}
if (openProfileModalBtn) {
    openProfileModalBtn.addEventListener('click', openProfileModal);
}
if (closeProfileModalBtn) {
    closeProfileModalBtn.addEventListener('click', () => {
        profileModal.classList.add('hidden');
    });
}
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', handleChangePassword);
}
if (resendVerificationBtn) {
    resendVerificationBtn.addEventListener('click', async () => {
        resendVerificationBtn.disabled = true;
        resendVerificationBtn.textContent = 'A reenviar...';

        try {
            const data = await api.resendVerificationEmail();
            showToast(data.message, 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            resendVerificationBtn.disabled = false;
            resendVerificationBtn.textContent = 'Reenviar E-mail de Verificação';
        }
    });
}
if (recurrentAddBtn) {
    recurrentAddBtn.addEventListener('click', () => switchAddBillMode('recurrent'));
}
if (recurrentEditModal) {
    // Botões de escolha (Somente esta, futuras, todas)
    recurrentEditModal.querySelectorAll('.recurrent-choice-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const scope = e.currentTarget.dataset.scope;
            if (!pendingUpdateData || !selectedParcel) return;

            recurrentEditModal.classList.add('hidden');
            showLoader();
            try {
                // Chama a nova rota da API com o escopo escolhido
                await api.bulkUpdateParcels(
                    selectedParcel.parentId, 
                    selectedParcel._id, 
                    pendingUpdateData.updatedParcelData, 
                    scope
                );

                // Atualiza a categoria do boleto, se foi alterada
                await api.updateBoleto(selectedParcel.parentId, pendingUpdateData.updatedBillData);

                showToast('Parcelas atualizadas com sucesso!', 'success');
                billModal.classList.add('hidden');
                await updateBillsOrganizer();
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                hideLoader();
                pendingUpdateData = null; // Limpa os dados pendentes
            }
        });
    });

    // Botão de cancelar
    cancelRecurrentEditBtn.addEventListener('click', () => {
        recurrentEditModal.classList.add('hidden');
        pendingUpdateData = null; // Limpa os dados pendentes
    });
}
if (closeAnnouncementBtn) {
    closeAnnouncementBtn.addEventListener('click', () => {
        globalAnnouncementBanner.classList.add('hidden');
    });
}

if (backToAdminBtn) {
    backToAdminBtn.addEventListener('click', async () => {
        // Chama a função que troca os tokens de volta
        const success = restoreAdminSession();

        if (success) {
            showLoader();
            const adminModule = await import('./admin.js');
            await adminModule.showAdminDashboard(setImpersonationSession);
            hideLoader();
        } else {
            showToast('Não foi possível restaurar a sessão de admin.', 'error');
            logout();
        }
    });
}
if (billForm) {
    billForm.addEventListener('submit', handleCalculateInstallments);
}
const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
const filterContainer = document.getElementById('filter-container');
const filterChevron = document.getElementById('filter-chevron');

if (toggleFiltersBtn && filterContainer && filterChevron) {
    toggleFiltersBtn.addEventListener('click', () => {
        // Mostra ou esconde o container dos filtros
        filterContainer.classList.toggle('hidden');
        // Gira a seta para indicar o estado (aberto/fechado)
        filterChevron.classList.toggle('rotate-180');
    });
}
const statusFilterSelect = document.getElementById('statusFilterSelect');
if (statusFilterSelect) {
    statusFilterSelect.addEventListener('change', applyFiltersAndSearch);
}
const prevDayBtn = document.getElementById('prevDay');
const nextDayBtn = document.getElementById('nextDay');
dailyListContainer = document.getElementById('dailyBillsList');
dailyDateDisplay = document.getElementById('currentDailyDate');
noDailyBillsMessage = document.getElementById('noDailyBills');

if (prevDayBtn) {
    prevDayBtn.addEventListener('click', () => {
        // Decrementa a data atual da visualização diária
        currentDailyViewDate.setDate(currentDailyViewDate.getDate() - 1);
        // Chama a função principal que aplica filtros e redesenha a tela
        applyFiltersAndSearch(); 
    });
}

if (nextDayBtn) {
    nextDayBtn.addEventListener('click', () => {
        // Incrementa a data atual da visualização diária
        currentDailyViewDate.setDate(currentDailyViewDate.getDate() + 1);
        // Chama a função principal que aplica filtros e redesenha a tela
        applyFiltersAndSearch(); 
    });
}

const dailyViewContainer = document.getElementById('dailyBillsViewer');
if (dailyViewContainer) {
    let touchStartX = 0;
    let touchCurrentX = 0;
    let isSwiping = false;
    const swipeThreshold = window.innerWidth / 3; // Precisa arrastar 1/3 da tela para mudar

    dailyViewContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        isSwiping = true;
        // Prepara o elemento para o arraste
        const list = document.getElementById('dailyBillsList');
        if (list) {
            list.classList.add('swiping');
            list.classList.remove('snap-back');
        }
    }, { passive: true });

    dailyViewContainer.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        touchCurrentX = e.touches[0].clientX;
        const deltaX = touchCurrentX - touchStartX;

        // Move a lista em tempo real com o dedo
        const list = document.getElementById('dailyBillsList');
        if (list) {
            list.style.transform = `translateX(${deltaX}px)`;
            list.style.opacity = 1 - Math.abs(deltaX) / window.innerWidth;
        }
    }, { passive: true });

    dailyViewContainer.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        isSwiping = false;

        // A mágica está aqui: pegamos a posição final EXATA do toque.
        // Num clique, touchEndX será quase igual a touchStartX.
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX; // <--- CÁLCULO CORRETO

        const list = document.getElementById('dailyBillsList');
        
        if (Math.abs(deltaX) > swipeThreshold) {
            // Swipe bem-sucedido, mudar o dia
            const direction = deltaX > 0 ? 'right' : 'left';
            const animationClass = deltaX > 0 ? 'slide-out-right' : 'slide-out-left';
            
            if (list) {
                list.classList.add(animationClass);
                list.addEventListener('animationend', () => {
                    list.style.transform = '';
                    list.style.opacity = 1;
                    list.classList.remove('swiping', animationClass);

                    if (direction === 'right') {
                        currentDailyViewDate.setDate(currentDailyViewDate.getDate() - 1);
                    } else {
                        currentDailyViewDate.setDate(currentDailyViewDate.getDate() + 1);
                    }
                    applyFiltersAndSearch(direction);

                }, { once: true });
            }
        } else {
            // Swipe não foi longo o suficiente (ou foi um clique), voltar à posição original
            if (list) {
                list.classList.add('snap-back');
                list.style.transform = '';
                list.style.opacity = 1;
                list.addEventListener('transitionend', () => {
                    list.classList.remove('swiping', 'snap-back');
                }, { once: true });
            }
        }
        
        // Reseta as posições para o próximo toque
        touchStartX = 0;
        touchCurrentX = 0;
    });
}

    initializeDashboardDragAndDrop();

});