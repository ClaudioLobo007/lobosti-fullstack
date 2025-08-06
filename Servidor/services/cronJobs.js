// D:\SCripts\SiteLobos\Servidor\services\cronJobs.js

const cron = require('node-cron');
const { getMasterConnection, getTenantConnection } = require('../config/db');
const { sendDailyReportEmail } = require('./emailService');
const BoletoSchema = require('../models/Boleto').schema;
const MasterCompany = require('../models/MasterCompany');
const MasterUser = require('../models/MasterUser');

/**
 * Inicializa todas as tarefas agendadas (cron jobs) da aplicação.
 */

function initCronJobs() {
    console.log('[CRON] Tarefas agendadas estão ativas.');

    cron.schedule('0 19 * * *', async () => {
        console.log('[CRON] A iniciar a verificação diária de boletos para envio de e-mails...');
        
        // Usamos a conexão Mestre que já foi estabelecida
        const masterDb = getMasterConnection();
        const MasterCompany = masterDb.model('MasterCompany', require('./models/MasterCompany').schema);

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Define a hora para o início do dia em UTC para comparações
        const todayStr = today.toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'

        try {
            // 3. Busca todas as empresas com assinatura ativa
            const activeCompanies = await MasterCompany.find({
                'subscription.status': 'active',
                'subscription.endDate': { $gt: today }
            });

            console.log(`[CRON] Encontradas ${activeCompanies.length} empresas ativas para notificar.`);

            // 4. Itera sobre cada empresa ativa
            for (const company of activeCompanies) {
                try {
                    const tenantDb = await getTenantConnection(company.dbName);
                    const Boleto = tenantDb.model('Boleto', BoletoSchema);

                    // 5. Busca as parcelas vencidas e a vencer hoje para esta empresa
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

                    // 6. Se houver parcelas, envia o e-mail
                    if (overdueParcels.length > 0 || dueTodayParcels.length > 0) {
                        console.log(`[CRON] A enviar e-mail para ${company.nomeEmpresa} (${company.email})...`);
                        await sendDailyReportEmail(masterDb, company.email, company.nomeEmpresa, overdueParcels, dueTodayParcels);
                    }

                } catch (tenantError) {
                    console.error(`[CRON] Erro ao processar a empresa ${company.nomeEmpresa}:`, tenantError);
                    // Continua para a próxima empresa mesmo se uma falhar
                }
            }
            console.log('[CRON] Verificação diária concluída.');

        } catch (masterError) {
            console.error('[CRON] Erro crítico ao buscar empresas ativas:', masterError);
        }
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo" // Garante que as 19:00 são no fuso horário de São Paulo/Brasil
    });

    // Tarefa agendada para limpar empresas não verificadas (executa todos os dias às 2 da manhã)
    cron.schedule('0 2 * * *', async () => {
        console.log('[CRON LIMPEZA] A iniciar a verificação de empresas não verificadas...');

        try {
            const masterDb = getMasterConnection();
            const MasterCompany = masterDb.model('MasterCompany', require('./models/MasterCompany').schema);
            const MasterUser = masterDb.model('MasterUser', require('./models/MasterUser').schema);

            // Calcula a data de 10 dias atrás
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

            // Encontra empresas não verificadas e criadas há mais de 10 dias
            const companiesToDelete = await MasterCompany.find({
                isVerified: false,
                createdAt: { $lt: tenDaysAgo }
            });

            if (companiesToDelete.length === 0) {
                console.log('[CRON LIMPEZA] Nenhuma empresa para limpar.');
                return;
            }

            console.log(`[CRON LIMPEZA] Encontradas ${companiesToDelete.length} empresas para apagar.`);

            for (const company of companiesToDelete) {
                try {
                    console.log(`[CRON LIMPEZA] A apagar a empresa: ${company.nomeEmpresa} (CNPJ: ${company.cnpj})`);

                    // Apaga a base de dados da empresa (tenant)
                    const tenantDb = await getTenantConnection(company.dbName);
                    await tenantDb.dropDatabase();

                    // Apaga os utilizadores associados no banco mestre
                    await MasterUser.deleteMany({ company: company._id });

                    // Apaga o registo da empresa no banco mestre
                    await MasterCompany.findByIdAndDelete(company._id);

                    console.log(`[CRON LIMPEZA] Empresa ${company.nomeEmpresa} apagada com sucesso.`);
                } catch (deleteError) {
                    console.error(`[CRON LIMPEZA] Erro ao apagar a empresa ${company.nomeEmpresa}:`, deleteError);
                }
            }

        } catch (error) {
            console.error('[CRON LIMPEZA] Erro crítico durante a tarefa de limpeza:', error);
        }
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });

}

// Exportamos a função de inicialização para ser usada no server.js
module.exports = { initCronJobs };