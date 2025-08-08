const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, PreApproval, Payment } = require('mercadopago');

// Importamos o schema do Mestre e a função para obter a conexão Mestre
const { schema: MasterCompanySchema } = require('../models/MasterCompany');
const { getMasterConnection } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// Cliente do Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });


// Rota para criar o link de assinatura (protegida)
router.post('/create-subscription', protect, async (req, res) => {
    try {
        if (req.user.role !== 'Proprietário') {
            console.log(`[MP DEBUG] Tentativa de criar assinatura por não-proprietário: ${req.user.username} (${req.user.role})`);
            return res.status(403).json({ message: 'Apenas o proprietário da empresa pode iniciar uma assinatura.' });
        }
        
        const companyId = req.user.companyId;
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        
        const company = await MasterCompany.findById(companyId);
        if (!company) {
            console.log(`[MP DEBUG] Empresa não encontrada para Company ID: ${companyId}`);
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }

        const plan = {
            reason: 'Assinatura Mensal - Organizador de Boletos',
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: 40.00,
                currency_id: 'BRL'
            },
            back_url: 'http://127.0.0.1:5500/orgboletos.html',
            payer_email: company.email || '' // Usa o email da empresa ou string vazia
        };

        const preapproval = new PreApproval(client);
        console.log(`[MP DEBUG] Tentando criar PreApproval no Mercado Pago para ${company.nomeEmpresa}...`);
        const response = await preapproval.create({ body: plan });

        if (response.id) {
            company.subscription.mercadopagoPreapprovalId = response.id;
            // Se o status da assinatura for 'inactive' ou null, defina-o como 'pending_approval' após a criação do link
            if (!company.subscription.status || company.subscription.status === 'inactive') {
                 company.subscription.status = 'pending_approval'; //
            }
            await company.save();
            console.log(`[MP DEBUG] Preapproval ID ${response.id} salvo para a empresa ${company.nomeEmpresa}. Status da assinatura atualizado para: ${company.subscription.status}`);
        }
        
        res.status(200).json({ init_point: response.init_point });

    } catch (error) {
        console.error('Erro ao criar assinatura no Mercado Pago:', error);
        res.status(500).json({ message: 'Não foi possível gerar o link de pagamento.' });
    }
});


// Rota para receber notificações (webhooks) do Mercado Pago (pública)
router.post('/webhook', async (req, res) => {
    const notification = req.body;
    // console.log('[MP WEBHOOK] Webhook recebido:', JSON.stringify(notification, null, 2));
    // console.log(`[MP WEBHOOK DEBUG] Tipo de Notificação: ${notification.type}, Data ID: ${notification.data.id}`);

    try {
        const masterDb = getMasterConnection();
        const MasterCompany = masterDb.model('MasterCompany', MasterCompanySchema);

        let preapprovalIdToLookUp = null;
        let statusFromMercadoPago = null;
        let nextPaymentDate = null;
        let isRelevantNotification = false;

        if (notification.type === 'payment' && notification.data && notification.data.id) {
            const paymentId = notification.data.id;
            // console.log(`[MP WEBHOOK DEBUG - PAYMENT] Tipo 'payment' recebido. ID do pagamento: ${paymentId}`);
            
            try {
                const payment = new Payment(client);
                const paymentDetails = await payment.get({ id: paymentId });
                // console.log(`[MP WEBHOOK DEBUG - PAYMENT] Detalhes COMPLETOS do Pagamento ${paymentId}: ${JSON.stringify(paymentDetails, null, 2)}`);
                
                statusFromMercadoPago = paymentDetails.status;
                preapprovalIdToLookUp = paymentDetails.point_of_interaction?.transaction_data?.subscription_id;
                
                // console.log(`[MP WEBHOOK DEBUG - PAYMENT] Status do Pagamento: ${statusFromMercadoPago}, Preapproval ID (do Point of Interaction): ${preapprovalIdToLookUp}`);

                if (preapprovalIdToLookUp && statusFromMercadoPago === 'approved') {
                    // console.log(`[MP WEBHOOK DEBUG - PAYMENT] Pagamento APROVADO. Buscando detalhes da pré-aprovação ${preapprovalIdToLookUp}...`);
                    const preapproval = new PreApproval(client);
                    const preapprovalDetails = await preapproval.get({ id: preapprovalIdToLookUp });
                    nextPaymentDate = preapprovalDetails.next_payment_date;
                    statusFromMercadoPago = preapprovalDetails.status;
                    // console.log(`[MP WEBHOOK DEBUG - PAYMENT] Detalhes da Pré-aprovação ${preapprovalIdToLookUp} (via payment): Status -> ${statusFromMercadoPago}, Próximo pagamento -> ${nextPaymentDate}`);
                    isRelevantNotification = true;
                } else {
                    // console.log(`[MP WEBHOOK DEBUG - PAYMENT] Pagamento não aprovado ou Preapproval ID ausente no POI para ID ${paymentId}. Status: ${statusFromMercadoPago}`);
                }
            } catch (error) {
                console.error(`[MP WEBHOOK ERROR - PAYMENT] Erro ao buscar detalhes do pagamento ${paymentId} ou pré-aprovação associada:`, error);
            }

        } else if (notification.type === 'preapproval' && notification.data && notification.data.id) {
            preapprovalIdToLookUp = notification.data.id;
            // console.log(`[MP WEBHOOK DEBUG - PREAPPROVAL] Tipo 'preapproval' recebido. ID da pré-aprovação: ${preapprovalIdToLookUp}`);
            
            try {
                const preapproval = new PreApproval(client);
                const subscriptionDetails = await preapproval.get({ id: preapprovalIdToLookUp });
                statusFromMercadoPago = subscriptionDetails.status;
                nextPaymentDate = subscriptionDetails.next_payment_date;
                // console.log(`[MP WEBHOOK DEBUG - PREAPPROVAL] Detalhes da Pré-aprovação ${preapprovalIdToLookUp} (via notificação direta): Status -> ${statusFromMercadoPago}, Próximo pagamento -> ${nextPaymentDate}`);
                isRelevantNotification = true;
            } catch (error) {
                console.error(`[MP WEBHOOK ERROR - PREAPPROVAL] Erro ao buscar detalhes da pré-aprovação ${preapprovalIdToLookUp}:`, error);
            }

        } else if (notification.type === 'subscription_authorized_payment' && notification.data && notification.data.id) {
            const authorizedPaymentId = notification.data.id;
            // console.log(`[MP WEBHOOK DEBUG - SUBSCRIPTION_AUTHORIZED_PAYMENT] Tipo 'subscription_authorized_payment' recebido. Authorized Payment ID: ${authorizedPaymentId}`);

            try {
                const payment = new Payment(client);
                const paymentDetails = await payment.get({ id: authorizedPaymentId });
                // console.log(`[MP WEBHOOK DEBUG - SUBSCRIPTION_AUTHORIZED_PAYMENT] Detalhes do Authorized Payment ${authorizedPaymentId}: ${JSON.stringify(paymentDetails, null, 2)}`);

                preapprovalIdToLookUp = paymentDetails.point_of_interaction?.transaction_data?.subscription_id;
                statusFromMercadoPago = paymentDetails.status;
                
                if (preapprovalIdToLookUp) {
                    // console.log(`[MP WEBHOOK DEBUG - SUBSCRIPTION_AUTHORIZED_PAYMENT] Preapproval ID ${preapprovalIdToLookUp} encontrado via authorized_payment.`);
                    const preapproval = new PreApproval(client);
                    const preapprovalDetails = await preapproval.get({ id: preapprovalIdToLookUp });
                    nextPaymentDate = preapprovalDetails.next_payment_date;
                    statusFromMercadoPago = preapprovalDetails.status;
                    // console.log(`[MP WEBHOOK DEBUG - SUBSCRIPTION_AUTHORIZED_PAYMENT] Preapproval ID ${preapprovalIdToLookUp} encontrado via authorized_payment. Status MP: ${statusFromMercadoPago}, Próximo Pagamento: ${nextPaymentDate}`);
                }
                isRelevantNotification = true;

            } catch (error) {
                console.error(`[MP WEBHOOK ERROR - SUBSCRIPTION_AUTHORIZED_PAYMENT] Erro ao buscar detalhes do authorized_payment ${authorizedPaymentId} ou preapproval associado:`, error);
            }

        } else {
            // console.log(`[MP WEBHOOK DEBUG] Tipo de notificação não tratado ou sem 'data.id': ${notification.type}. Ignorando.`);
            return res.sendStatus(200); 
        }
        
        let companyToUpdate = null;
        if (preapprovalIdToLookUp) {
            companyToUpdate = await MasterCompany.findOne({ 'subscription.mercadopagoPreapprovalId': preapprovalIdToLookUp });
            if (!companyToUpdate) {
                // console.log(`[MP WEBHOOK] Empresa NÃO encontrada no DB para o mercadopagoPreapprovalId: ${preapprovalIdToLookUp}. Isso pode ocorrer se o ID na notificação não corresponder ao ID salvo.`);
            }
        } else {
            // console.log(`[MP WEBHOOK] Não foi possível obter um Preapproval ID da notificação para buscar a empresa no DB.`);
        }
        
        if (companyToUpdate && (statusFromMercadoPago === 'approved' || statusFromMercadoPago === 'authorized' || statusFromMercadoPago === 'active' || statusFromMercadoPago === 'pending')) {
            // console.log(`[MP WEBHOOK] Tentando atualizar assinatura para empresa ${companyToUpdate.nomeEmpresa}. Status MP: ${statusFromMercadoPago}, Próximo pagamento: ${nextPaymentDate}`);
            
            const currentDbEndDate = companyToUpdate.subscription.endDate;
            let shouldUpdate = false;
            
            if (companyToUpdate.subscription.status !== 'active') {
                shouldUpdate = true;
                // console.log(`[MP WEBHOOK] Status da assinatura de ${companyToUpdate.nomeEmpresa} mudará para 'active'.`);
            }
            
            if (nextPaymentDate && (!currentDbEndDate || new Date(nextPaymentDate) > new Date(currentDbEndDate))) {
                shouldUpdate = true;
                // console.log(`[MP WEBHOOK] Data de término da assinatura de ${companyToUpdate.nomeEmpresa} será atualizada para ${nextPaymentDate}.`);
            } else if (!nextPaymentDate && statusFromMercadoPago === 'active') {
                if (!currentDbEndDate || new Date(currentDbEndDate) < new Date()) {
                    shouldUpdate = true;
                    nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    console.log(`[MP WEBHOOK] Definindo data de término padrão (30 dias) para ${companyToUpdate.nomeEmpresa} como fallback.`);
                }
            }

            if (shouldUpdate) {
                companyToUpdate.subscription.status = 'active';
                companyToUpdate.subscription.endDate = nextPaymentDate ? new Date(nextPaymentDate) : companyToUpdate.subscription.endDate; 
                await companyToUpdate.save();
                console.log(`---> SUCESSO: Assinatura da empresa ${companyToUpdate.nomeEmpresa} ATIVADA/ATUALIZADA.`);
                // console.log(`[MP WEBHOOK DEBUG] Novo Status salvo no DB: ${companyToUpdate.subscription.status}`);
                // console.log(`[MP WEBHOOK DEBUG] Nova Data de Término salva no DB: ${companyToUpdate.subscription.endDate ? companyToUpdate.subscription.endDate.toLocaleDateString('pt-BR') : 'N/A'}`);
            } else {
                console.log(`[MP WEBHOOK] Assinatura da empresa ${companyToUpdate.nomeEmpresa} já está ativa e atualizada ou não precisa de alteração. Nenhuma ação no DB.`);
            }
        } else {
            // console.log(`[MP WEBHOOK] Notificação processada, mas NÃO resultou em ativação (condições não atendidas ou empresa não encontrada).`);
            // console.log(`[MP WEBHOOK] Final Preapproval ID: ${preapprovalIdToLookUp}, Status MP: ${statusFromMercadoPago}, Empresa encontrada no DB: ${!!companyToUpdate}`);
        }
        
        res.sendStatus(200);

    } catch (error) {
        console.error('Erro geral no processamento do webhook do Mercado Pago:', error);
        res.sendStatus(500);
    }
});

module.exports = router;