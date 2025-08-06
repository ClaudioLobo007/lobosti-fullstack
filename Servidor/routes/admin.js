const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// CORREÇÃO: Importamos os ESQUEMAS, e não os modelos pré-compilados
const { schema: MasterCompanySchema } = require('../models/MasterCompany');
const { schema: MasterUserSchema } = require('../models/MasterUser');
const { schema: BoletoSchema } = require('../models/Boleto');
const { schema: AnnouncementSchema } = require('../models/Announcement');
const { schema: EmailTemplateSchema } = require('../models/EmailTemplate');

const { getTenantConnection } = require('../config/db');
const { sendDailyReportEmail } = require('../services/emailService');
const emailService = require('../services/emailService');


// Nova rota para buscar a lista de assinaturas de todas as empresas
router.get('/subscriptions', async (req, res) => {
    try {
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const companies = await MasterCompany.find({}).select('_id nomeEmpresa cnpj subscription').sort({ nomeEmpresa: 1 });

        // --- LÓGICA NOVA ADICIONADA AQUI ---
        const today = new Date();
        const processedCompanies = companies.map(c => {
            const company = c.toObject(); // Converte para um objeto simples para podermos modificar
            
            // Se a assinatura está "ativa" mas a data de expiração já passou...
            if (company.subscription && company.subscription.status === 'active' && new Date(company.subscription.endDate) < today) {
                // ...nós alteramos o status para 'expirada' apenas na resposta da API.
                company.subscription.status = 'expired';
            }
            return company;
        });
        // --- FIM DA LÓGICA NOVA ---

        res.json(processedCompanies); // Envia a lista processada

    } catch (error) {
        console.error("Erro ao buscar dados de assinaturas para o admin:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// Nova rota para buscar as estatísticas do dashboard do admin
router.get('/dashboard-stats', async (req, res) => {
    try {
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema); // Corrigido para usar o Schema correto

        // Buscas para os KPIs
        const totalCompanies = await MasterCompany.countDocuments();
        const totalUsers = await MasterUser.countDocuments();
        const activeSubscriptions = await MasterCompany.countDocuments({ 'subscription.status': 'active' });

        // --- A CORREÇÃO ESTÁ AQUI ---
        // Preenchemos a lógica de agregação que estava em falta
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const newCompaniesData = await MasterCompany.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { 
                $group: { 
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                } 
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", count: "$count" } }
        ]);

        // Busca pelas empresas recentes
        const recentlyAddedCompanies = await MasterCompany.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select('nomeEmpresa createdAt');

        // Envia a resposta completa
        res.json({
            totalCompanies,
            totalUsers,
            activeSubscriptions,
            newCompaniesLast30Days: newCompaniesData,
            recentlyAddedCompanies: recentlyAddedCompanies
        });

    } catch (error) {
        console.error("Erro ao buscar estatísticas do dashboard de admin:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

router.post('/impersonate', async (req, res) => {
    try {
        const masterDb = req.masterDb;
        const MasterCompany = masterDb.model('MasterCompany', MasterCompanySchema);
        const MasterUser = masterDb.model('MasterUser', MasterUserSchema);
        const adminId = req.user.id;
        const { companyId, userId } = req.body;
        const userToImpersonate = await MasterUser.findById(userId);

        if (!userToImpersonate || userToImpersonate.company.toString() !== companyId) {
             return res.status(404).json({ message: "Usuário não encontrado nesta empresa." });
        }
        
        const companyToImpersonate = await MasterCompany.findById(companyId);
        if (!companyToImpersonate) {
            return res.status(404).json({ message: "Empresa não encontrada." });
        }

        const token = jwt.sign(
            { 
                id: userToImpersonate._id,
                companyId: userToImpersonate.company, 
                username: userToImpersonate.username, // Importante para a rota /me
                impersonator: adminId
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Token de representação gerado com sucesso.',
            token,
            user: { _id: userToImpersonate._id, username: userToImpersonate.username },
            company: { _id: companyToImpersonate._id, nomeEmpresa: companyToImpersonate.nomeEmpresa }
        });

    } catch (error) {
        console.error("Erro ao tentar representar usuário:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// Rota para testar manualmente o envio do relatório diário
router.post('/test-daily-report', async (req, res) => {
    // Esta rota é para o admin representar uma empresa e testar o e-mail para ela
    if (!req.user.impersonator) {
        return res.status(403).json({ message: 'Esta função só pode ser usada pelo SuperAdmin ao representar uma empresa.' });
    }

    console.log('[TESTE MANUAL] A iniciar teste de relatório diário...');
    const company = req.company; // O middleware já nos deu a empresa representada

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    try {
        const tenantDb = req.tenantDb; // O middleware já nos deu a conexão
        const Boleto = tenantDb.model('Boleto', BoletoSchema);

        const overdueParcels = await Boleto.aggregate([
            { $unwind: '$parcels' },
            { $match: { 'parcels.paid': false, 'parcels.dueDate': { $lt: todayStr } } },
            { $project: { _id: 0, billName: '$name', nfeNumber: '$nfeNumber', parcelNumber: '$parcels.number', amount: '$parcels.amount', dueDate: '$parcels.dueDate' } }
        ]);

        const dueTodayParcels = await Boleto.aggregate([
            { $unwind: '$parcels' },
            { $match: { 'parcels.paid': false, 'parcels.dueDate': todayStr } },
            { $project: { _id: 0, billName: '$name', nfeNumber: '$nfeNumber', parcelNumber: '$parcels.number', amount: '$parcels.amount', dueDate: '$parcels.dueDate' } }
        ]);

        console.log(`[TESTE MANUAL] Parcelas vencidas encontradas: ${overdueParcels.length}`);
        console.log(`[TESTE MANUAL] Parcelas a vencer hoje encontradas: ${dueTodayParcels.length}`);

        if (overdueParcels.length > 0 || dueTodayParcels.length > 0) {
            console.log(`[TESTE MANUAL] A enviar e-mail para ${company.email}...`);
            await sendDailyReportEmail(company.email, company.nomeEmpresa, overdueParcels, dueTodayParcels);
            res.status(200).json({ 
                message: `E-mail de relatório enviado para ${company.email}!`,
                overdueCount: overdueParcels.length,
                dueTodayCount: dueTodayParcels.length
            });
        } else {
            console.log('[TESTE MANUAL] Nenhum dado para enviar.');
            res.status(200).json({ 
                message: 'A lógica funcionou, mas não havia parcelas vencidas ou a vencer hoje para reportar.',
                overdueCount: 0,
                dueTodayCount: 0
            });
        }
    } catch (error) {
        console.error('[TESTE MANUAL] Erro:', error);
        res.status(500).json({ message: 'Ocorreu um erro durante o teste.' });
    }
});

// --- GESTÃO DE ANÚNCIOS ---

router.route('/announcements')
    // Rota para LER todos os anúncios
    .get(async (req, res) => {
        try {
            const Announcement = req.masterDb.model('Announcement', AnnouncementSchema);
            const announcements = await Announcement.find({}).sort({ createdAt: -1 });
            res.status(200).json(announcements);
        } catch (error) {
            console.error("Erro ao buscar anúncios:", error);
            res.status(500).json({ message: 'Erro ao buscar anúncios.' });
        }
    })
    // Rota para CRIAR um novo anúncio
    .post(async (req, res) => {
        try {
            const Announcement = req.masterDb.model('Announcement', AnnouncementSchema);
            const { message, link, isActive } = req.body;

            if (!message) {
                return res.status(400).json({ message: 'O campo "message" é obrigatório.' });
            }

            const newAnnouncement = await Announcement.create({ message, link, isActive });
            res.status(201).json(newAnnouncement);
        } catch (error) {
            console.error("Erro ao criar anúncio:", error);
            res.status(500).json({ message: 'Erro interno do servidor ao criar o anúncio.' });
        }
    });

// Rota para ATUALIZAR um anúncio
router.patch('/announcements/:id', async (req, res) => {
    if (req.user.role !== 'SuperAdmin') return res.status(403).json({ message: 'Acesso negado.' });
    try {
        const { message, link, isActive } = req.body;
        const Announcement = req.masterDb.model('Announcement', AnnouncementSchema);
        
        if (isActive) {
            await Announcement.updateMany({}, { $set: { isActive: false } });
        }

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            req.params.id,
            { message, link, isActive },
            { new: true }
        );
        res.status(200).json(updatedAnnouncement);
    } catch (error) {
        console.error("Erro ao atualizar anúncio:", error); // Adiciona log de erro
        res.status(500).json({ message: 'Erro ao atualizar anúncio.' });
    }
});

// Rota para APAGAR um anúncio
router.delete('/announcements/:id', async (req, res) => {
    if (req.user.role !== 'SuperAdmin') return res.status(403).json({ message: 'Acesso negado.' });
    try {
        const Announcement = req.masterDb.model('Announcement', AnnouncementSchema);
        await Announcement.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Anúncio apagado com sucesso.' });
    } catch (error) {
        console.error("Erro ao apagar anúncio:", error); // Adiciona log de erro
        res.status(500).json({ message: 'Erro ao apagar anúncio.' });
    }
});

// Rota para LER todos os templates de e-mail
router.get('/email-templates', async (req, res) => {
    try {
        const EmailTemplate = req.masterDb.model('EmailTemplate', EmailTemplateSchema);
        const templates = await EmailTemplate.find({}).select('name subject'); // Só precisamos do nome e assunto para a lista
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar templates de e-mail.' });
    }
});

// Rota para LER UM template de e-mail específico pelo ID
router.get('/email-templates/:templateId', async (req, res) => {
    try {
        const EmailTemplate = req.masterDb.model('EmailTemplate', EmailTemplateSchema);
        const template = await EmailTemplate.findById(req.params.templateId);
        if (!template) {
            return res.status(404).json({ message: 'Template não encontrado.' });
        }
        res.json(template); // Retorna o documento completo, incluindo o 'body'
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar detalhes do template.' });
    }
});

// Rota para ATUALIZAR um template específico
router.patch('/email-templates/:templateId', async (req, res) => {
    try {
        const { subject, body } = req.body;
        const EmailTemplate = req.masterDb.model('EmailTemplate', EmailTemplateSchema);
        const updatedTemplate = await EmailTemplate.findByIdAndUpdate(
            req.params.templateId,
            { subject, body },
            { new: true }
        );
        res.json(updatedTemplate);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar o template de e-mail.' });
    }
});

// Rota de pesquisa global para o admin
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q || ''; // 'q' vem de "query"
        if (query.length < 2) {
            // Evita pesquisas vazias ou muito curtas para não sobrecarregar o DB
            return res.json({ users: [], companies: [] });
        }

        // Cria uma expressão regular para pesquisa case-insensitive
        const searchRegex = new RegExp(query, 'i');

        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);

        // 1. Pesquisa por Utilizadores (no username e email)
        const userResults = await MasterUser.find({
            $or: [
                { username: searchRegex },
                { email: searchRegex }
            ]
        }).populate('company', 'nomeEmpresa'); // Inclui o nome da empresa no resultado

        // 2. Pesquisa por Empresas (no nome e CNPJ)
        const companyResults = await MasterCompany.find({
            $or: [
                { nomeEmpresa: searchRegex },
                { cnpj: query.replace(/\D/g, '') } // Pesquisa por CNPJ apenas com números
            ]
        });

        // 3. Retorna os resultados em um objeto organizado
        res.json({
            users: userResults,
            companies: companyResults
        });

    } catch (error) {
        console.error("Erro na pesquisa global do admin:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

router.post('/bulk-email', async (req, res) => {
    try {
        const { audience, subject, body } = req.body;
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);

        let recipients = [];
        
        // A lógica switch agora está completa
        switch (audience) {
            case 'allProprietors':
                recipients = await MasterUser.find({ role: 'Proprietário' }).select('email');
                break;

            case 'activeSubscribers':
                const activeCompanies = await MasterCompany.find({ 'subscription.status': 'active' }).select('_id');
                const activeCompanyIds = activeCompanies.map(c => c._id);
                recipients = await MasterUser.find({ company: { $in: activeCompanyIds }, role: 'Proprietário' }).select('email');
                break;
            
            // --- NOVO CÓDIGO ADICIONADO ABAIXO ---

            case 'inactiveSubscribers':
                // Busca empresas cuja assinatura NÃO seja 'active'
                const inactiveCompanies = await MasterCompany.find({ 'subscription.status': { $ne: 'active' } }).select('_id');
                const inactiveCompanyIds = inactiveCompanies.map(c => c._id);
                recipients = await MasterUser.find({ company: { $in: inactiveCompanyIds }, role: 'Proprietário' }).select('email');
                break;

            case 'allUsers':
                // Busca todos os utilizadores, sem distinção de cargo
                recipients = await MasterUser.find({}).select('email');
                break;

            // --- FIM DO NOVO CÓDIGO ---

            default:
                return res.status(400).json({ message: 'Público-alvo inválido.' });
        }

        const emailList = recipients
            .map(r => r.email)
            .filter(email => email);

        if (emailList.length === 0) {
            // Alterado para um erro 404 (Not Found) que é mais apropriado
            return res.status(404).json({ message: 'Nenhum destinatário com e-mail válido encontrado para este público.' });
        }
        
        for (const email of emailList) {
            await emailService.sendGenericEmail(email, subject, body);
        }

        res.json({ message: `E-mail enviado para ${emailList.length} destinatários.` });

    } catch (error) {
        console.error("Erro no envio de e-mail em massa:", error);
        res.status(500).json({ message: "Ocorreu um erro ao tentar enviar os e-mails." });
    }
});

router.post('/email-templates/test-send', async (req, res) => {
    try {
        const { templateName, companyId, recipientEmail } = req.body;

        if (!templateName || !companyId || !recipientEmail) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios: nome do template, ID da empresa e e-mail do destinatário.' });
        }

        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const company = await MasterCompany.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Empresa selecionada não encontrada.' });
        }

        let placeholders = {};

        // Simula a recolha de dados com base no nome do template
        switch (templateName) {
            case 'dailyReport':
                const tenantDb = await getTenantConnection(company.dbName);
                const Boleto = tenantDb.model('Boleto', require('../models/Boleto').schema);
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);
                const todayStr = today.toISOString().split('T')[0];

                // Busca as parcelas vencidas
                const overdueParcels = await Boleto.aggregate([
                    { $unwind: '$parcels' },
                    { $match: { 'parcels.paid': false, 'parcels.dueDate': { $lt: todayStr } } },
                    { $project: { _id: 0, billName: '$name', nfeNumber: '$nfeNumber', parcelNumber: '$parcels.number', amount: '$parcels.amount', dueDate: '$parcels.dueDate' } }
                ]);

                // Busca as parcelas que vencem hoje
                const dueTodayParcels = await Boleto.aggregate([
                    { $unwind: '$parcels' },
                    { $match: { 'parcels.paid': false, 'parcels.dueDate': todayStr } },
                    { $project: { _id: 0, billName: '$name', nfeNumber: '$nfeNumber', parcelNumber: '$parcels.number', amount: '$parcels.amount', dueDate: '$parcels.dueDate' } }
                ]);
                
                // Gera o HTML das listas de parcelas
                let parcelsHtml = '';
                if (overdueParcels.length > 0) {
                    const overdueHtmlList = overdueParcels.map(item => `
                        <div style="border: 1px solid #c0392b; padding: 10px; margin-bottom: 10px; border-radius: 5px; background-color: #f2dede;">
                            <strong>Nome:</strong> ${item.billName}<br>
                            ${item.nfeNumber ? `<strong>Cód. NF:</strong> ${item.nfeNumber}<br>` : ''}
                            <strong>Parcela:</strong> ${item.parcelNumber}<br>
                            <strong>Valor:</strong> ${item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
                            <strong>Vencimento:</strong> ${new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                    `).join('');
                    parcelsHtml += `<h3 style="color: #c0392b;">🚨 Parcelas Vencidas</h3>${overdueHtmlList}`;
                }

                if (dueTodayParcels.length > 0) {
                    const dueTodayHtmlList = dueTodayParcels.map(item => `
                        <div style="border: 1px solid #2980b9; padding: 10px; margin-bottom: 10px; border-radius: 5px; background-color: #eaf2f8;">
                            <strong>Nome:</strong> ${item.billName}<br>
                            ${item.nfeNumber ? `<strong>Cód. NF:</strong> ${item.nfeNumber}<br>` : ''}
                            <strong>Parcela:</strong> ${item.parcelNumber}<br>
                            <strong>Valor:</strong> ${item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
                            <strong>Vencimento:</strong> ${new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                    `).join('');
                    parcelsHtml += `<h3 style="margin-top: 25px;">🔵 A Vencer Hoje</h3>${dueTodayHtmlList}`;
                }

                if (parcelsHtml === '') {
                    parcelsHtml = '<p>Nenhum boleto vencido ou a vencer hoje para esta empresa. Bom trabalho!</p>';
                }
                
                placeholders = {
                    companyName: company.nomeEmpresa,
                    parcelsHtml: parcelsHtml
                };
                break;

            case 'emailVerification':
                placeholders = {
                    companyName: company.nomeEmpresa,
                    verificationLink: '#' // Usamos um link de exemplo, pois o token é gerado apenas no registo real
                };
                break;

            case 'passwordReset':
                placeholders = {
                    resetLink: '#' // Usamos um link de exemplo, pois o token é gerado apenas na solicitação real
                };
                break;

            default:
                return res.status(400).json({ message: 'Nome de template desconhecido.' });
        }

        // Usa a função do emailService para enviar o e-mail de teste para o destinatário especificado
        await emailService.sendEmailFromTemplate(req.masterDb, templateName, recipientEmail, placeholders);

        res.json({ message: `E-mail de teste enviado com sucesso para ${recipientEmail}!` });

    } catch (error) {
        console.error("Erro ao enviar e-mail de teste:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

module.exports = router;