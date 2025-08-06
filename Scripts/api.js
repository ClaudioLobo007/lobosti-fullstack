import { API_BASE_URL } from './config.js';

/**
 * Função genérica para realizar chamadas à API, agora com tratamento para tokens expirados.
 * @param {string} endpoint - O endpoint para o qual a chamada será feita (ex: '/api/boletos').
 * @param {object} options - As opções para o 'fetch' (method, body, etc.).
 * @returns {Promise<any>} Os dados da resposta em formato JSON.
 */
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!options.isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

        // --- NOVA LÓGICA DE TRATAMENTO DE ERRO ---
        if (response.status === 401) {
            // Se o erro for 401 (Não Autorizado), o token provavelmente expirou.
            console.warn("Token expirado ou inválido. A redirecionar para o login.");

            // Limpa os dados de sessão do navegador
            localStorage.removeItem('authToken');
            localStorage.removeItem('superAdminToken');

            // Redireciona o utilizador para a página de login
            window.location.href = 'Index.html';

            // Lança um erro para interromper a execução do código que chamou esta função
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.message || 'Ocorreu um erro na API.');
            error.details = data.errors;
            throw error;
        }
        return data;
    } catch (error) {
        console.error(`Erro na chamada à API para ${endpoint}:`, error);
        // Re-lança o erro para que a função que chamou saiba que algo deu errado
        throw error;
    }
}

// --- Funções de Autenticação ---
export const loginCompany = (cnpj, password) => apiCall('/api/auth/login/company', { method: 'POST', body: JSON.stringify({ cnpj, password }) });
export const loginAdmin = (username, password) => apiCall('/api/auth/login/admin', { method: 'POST', body: JSON.stringify({ username, password }) });
export const loginUser = (username, password, companyId) => apiCall('/api/auth/login/user', { method: 'POST', body: JSON.stringify({ username, password, companyId }) });
export const registerUser = (username, password, email, role, companyId) => apiCall('/api/auth/register/user', { method: 'POST', body: JSON.stringify({ username, password, email, role, companyId }) });
export const checkSession = () => apiCall('/api/auth/me');
export const loginDirect = (cnpj, username, password) => apiCall('/api/auth/login/direct', { method: 'POST', body: JSON.stringify({ cnpj, username, password }) });
export const findCompanyByCnpj = (cnpj) => apiCall('/api/auth/find-company-by-cnpj', { method: 'POST', body: JSON.stringify({ cnpj }) });
export const requestPasswordReset = (email) => apiCall('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
export const changePassword = (passwords) => apiCall('/api/auth/change-password', { method: 'POST', body: JSON.stringify(passwords) });
export const resendVerificationEmail = () => apiCall('/api/auth/resend-verification', { method: 'POST' });


// --- Funções do Administrador ---
export const impersonateUser = (companyId, userId) => apiCall('/api/admin/impersonate', { method: 'POST', body: JSON.stringify({ companyId, userId }) });
export const getEmailTemplates = () => apiCall('/api/admin/email-templates');
export const updateEmailTemplate = (templateId, data) => apiCall(`/api/admin/email-templates/${templateId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
});
export const getEmailTemplateById = (templateId) => apiCall(`/api/admin/email-templates/${templateId}`);
export const globalAdminSearch = (query) => apiCall(`/api/admin/search?q=${encodeURIComponent(query)}`);
export const sendBulkEmail = (data) => apiCall('/api/admin/bulk-email', {
    method: 'POST',
    body: JSON.stringify(data)
});
export const sendTestEmail = (data) => apiCall('/api/admin/email-templates/test-send', {
    method: 'POST',
    body: JSON.stringify(data)
});



// --- Funções de Empresas ---
export const getCompanies = () => apiCall('/api/companies');
export const getCompanyDetails = (companyId) => apiCall(`/api/companies/${companyId}`);
export const createCompany = (companyData) => apiCall('/api/companies', { method: 'POST', body: JSON.stringify(companyData) });
export const updateCompany = (companyId, updateData) => apiCall(`/api/companies/${companyId}`, { method: 'PATCH', body: JSON.stringify(updateData) });
export const deleteCompany = (companyId) => apiCall(`/api/companies/${companyId}`, { method: 'DELETE' });
export const deleteUserFromCompany = (companyId, userId) => apiCall(`/api/companies/${companyId}/users/${userId}`, { method: 'DELETE' });
export const addSubscription = (companyId, daysToAdd) => apiCall(`/api/companies/${companyId}/subscription`, { method: 'PATCH', body: JSON.stringify({ daysToAdd }) });
export const removeSubscription = (companyId) => apiCall(`/api/companies/${companyId}/subscription`, { method: 'DELETE' });
export const updateUserRole = (companyId, userId, role) => apiCall(`/api/companies/${companyId}/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const getCategories = () => apiCall('/api/categories');
export const createCategory = (name) => apiCall('/api/categories', { method: 'POST', body: JSON.stringify({ name }) });
export const updateCategory = (id, name) => apiCall(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
export const deleteCategory = (id) => apiCall(`/api/categories/${id}`, { method: 'DELETE' });


// --- Funções de Boletos ---
export const getBoletos = () => apiCall('/api/boletos');
export const createBoleto = (boletoData) => apiCall('/api/boletos', { method: 'POST', body: JSON.stringify(boletoData) });
export const updateParcel = (boletoId, parcelId, updateData) => apiCall(`/api/boletos/${boletoId}/parcels/${parcelId}`, { method: 'PATCH', body: JSON.stringify(updateData) });
export const deleteParcel = (boletoId, parcelId) => apiCall(`/api/boletos/${boletoId}/parcels/${parcelId}`, { method: 'DELETE' });
export const deleteBoleto = (boletoId) => apiCall(`/api/boletos/${boletoId}`, { method: 'DELETE' });
export const uploadAttachment = (boletoId, parcelId, formData) => {
    return apiCall(`/api/boletos/${boletoId}/parcels/${parcelId}/attach`, {
        method: 'POST',
        body: formData,
        isFormData: true 
    });
};
export const deleteAttachment = (boletoId, parcelId) => apiCall(`/api/boletos/${boletoId}/parcels/${parcelId}/attach`, { method: 'DELETE' });
export const updateBoleto = (id, data) => apiCall(`/api/boletos/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const markParcelsAsPaid = (parcelIds) => apiCall('/api/boletos/parcels/mark-as-paid', { method: 'PATCH', body: JSON.stringify({ parcelIds }) });
export const bulkUpdateCategory = (boletoIds, categoryId) => apiCall('/api/boletos/bulk-update-category', { method: 'PATCH', body: JSON.stringify({ boletoIds, categoryId }) });
export const bulkUpdateParcels = (boletoId, parcelId, updatedData, scope) => apiCall('/api/boletos/bulk-update-parcels', { 
    method: 'PATCH', 
    body: JSON.stringify({ boletoId, parcelId, updatedData, scope }) 
});


// --- Funções de Permissões ---
export const getPermissions = () => apiCall('/api/permissions');
export const updatePermissions = (permissionsData) => apiCall('/api/permissions', { method: 'PATCH', body: JSON.stringify(permissionsData) });


// --- Funções de Pagamentos ---
export const createSubscriptionLink = () => apiCall('/api/payments/create-subscription', { method: 'POST' });


// --- Funções de NFe ---
export const findNfe = (chave) => apiCall(`/api/nfe/${chave}`);


// --- Funções de Contato ---
export const sendContactForm = (formData) => apiCall('/api/contact/send', { method: 'POST', body: JSON.stringify(formData) });

// --- Funções DashBoard ---

/**
 * Constrói uma query string a partir de um objeto de parâmetros.
 * @param {object} params - O objeto com os parâmetros (ex: {startDate, endDate}).
 * @returns {string} - A query string formatada (ex: "?startDate=2025-07-01&endDate=2025-07-31").
 */
function buildQueryString(params) {
    // Remove quaisquer chaves que não tenham valor
    const validParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    );
    
    const query = new URLSearchParams(validParams).toString();
    return query ? `?${query}` : '';
}

export const getExpensesByCategory = (dateRange = {}, status = 'all') => apiCall(`/api/reports/expenses-by-category${buildQueryString({ ...dateRange, status })}`);
export const getMonthlySummary = (dateRange = {}, status = 'all') => apiCall(`/api/reports/monthly-summary${buildQueryString({ ...dateRange, status })}`);
export const getKpiSummary = (dateRange = {}) => apiCall(`/api/reports/kpi-summary${buildQueryString(dateRange)}`);
export const getUpcomingPayments = () => apiCall('/api/reports/upcoming-payments');

// --- Funções Importação ---

export const importBoletos = (boletosData) => apiCall('/api/boletos/batch-import', { 
    method: 'POST', 
    body: JSON.stringify({ boletos: boletosData }) 
});

// --- Funções de Anúncios ---
export const getActiveAnnouncement = () => apiCall('/api/announcements/active');
export const getAllAnnouncements = () => apiCall('/api/admin/announcements');
export const createAnnouncement = (data) => apiCall('/api/admin/announcements', { method: 'POST', body: JSON.stringify(data) });
export const updateAnnouncement = (id, data) => apiCall(`/api/admin/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteAnnouncement = (id) => apiCall(`/api/admin/announcements/${id}`, { method: 'DELETE' });

// --- Funções do Dashboard de Admin ---
export const getAdminDashboardStats = () => apiCall('/api/admin/dashboard-stats');

export const getAdminSubscriptions = () => apiCall('/api/admin/subscriptions');