const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const EmailTemplateSchema = require('../models/EmailTemplate').schema;
require('dotenv').config();

// Configuração do Nodemailer (inalterada)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// =================================================================================
// Função Auxiliar Principal (Modificada)
// =================================================================================

/**
 * Busca um template no DB, substitui placeholders e envia o e-mail.
 * @param {mongoose.Connection} masterDb - A conexão com a base de dados mestre.
 * @param {string} templateName - O nome único do template.
 * @param {string} toEmail - O e-mail do destinatário.
 * @param {object} placeholders - Um objeto com os valores a serem substituídos.
 */
async function sendEmailFromTemplate(masterDb, templateName, toEmail, placeholders = {}) {
    try {
        // CORREÇÃO: Usa a conexão 'masterDb' fornecida em vez da conexão global
        const EmailTemplate = masterDb.model('EmailTemplate', EmailTemplateSchema);
        const template = await EmailTemplate.findOne({ name: templateName });

        if (!template) {
            console.error(`ERRO CRÍTICO: Template de e-mail '${templateName}' não foi encontrado na base de dados.`);
            return;
        }

        let subject = template.subject;
        let body = template.body;

        for (const key in placeholders) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            subject = subject.replace(regex, placeholders[key]);
            body = body.replace(regex, placeholders[key]);
        }

        const mailOptions = {
            from: `"Organizador de Boletos" <${process.env.EMAIL_FROM}>`,
            to: toEmail,
            subject: subject,
            html: body,
        };

        await transporter.sendMail(mailOptions);
        console.log(`E-mail do template '${templateName}' enviado com sucesso para ${toEmail}`);

    } catch (error) {
        console.error(`Erro ao enviar e-mail do template '${templateName}' para ${toEmail}:`, error);
        throw error;
    }
}


// =================================================================================
// Funções que Usam Templates (Modificadas)
// =================================================================================

async function sendVerificationEmail(masterDb, toEmail, companyName, token) {
    const verificationLink = `${process.env.FRONTEND_BASE_URL}/verify-email.html?token=${token}`;
    const placeholders = { companyName, verificationLink };
    await sendEmailFromTemplate(masterDb, 'emailVerification', toEmail, placeholders);
}

async function sendPasswordResetEmail(masterDb, toEmail, token) {
    const resetLink = `${process.env.FRONTEND_BASE_URL}/reset-password.html?token=${token}`;
    const placeholders = { resetLink };
    await sendEmailFromTemplate(masterDb, 'passwordReset', toEmail, placeholders);
}

async function sendDailyReportEmail(masterDb, toEmail, companyName, overdueParcels, dueTodayParcels) {
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
        
        parcelsHtml += `
            <h3 style="color: #c0392b;">🚨 Parcelas Vencidas</h3>
            ${overdueHtmlList}
        `;
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

        parcelsHtml += `
            <h3 style="color: #2980b9; margin-top: 25px;">🔵 A Vencer Hoje</h3>
            ${dueTodayHtmlList}
        `;
    }

    const placeholders = { companyName, parcelsHtml };
    await sendEmailFromTemplate(masterDb, 'dailyReport', toEmail, placeholders);
}


// =================================================================================
// Funções que Não Usam a Base de Dados (Inalteradas)
// =================================================================================

async function sendContactFormEmail(fromName, fromEmail, subject, message) {
    const toEmail = process.env.CONTACT_FORM_RECIPIENT;
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Nova Mensagem de Contato do Site</h2>
            <p>Você recebeu uma nova mensagem através do formulário de contato do site LobosTI.</p>
            <hr>
            <p><strong>Nome:</strong> ${fromName}</p>
            <p><strong>E-mail do Remetente:</strong> ${fromEmail}</p>
            <p><strong>Assunto:</strong> ${subject}</p>
            <p><strong>Mensagem:</strong></p>
            <p style="padding: 10px; border-left: 3px solid #ccc;">${message.replace(/\n/g, '<br>')}</p>
            <hr>
        </div>
    `;
    const mailOptions = { from: `"Site LobosTI" <${process.env.EMAIL_FROM}>`, to: toEmail, subject: `Nova Mensagem de Contato: ${subject}`, html: emailHtml, replyTo: fromEmail };
    await transporter.sendMail(mailOptions);
}

async function sendGenericEmail(toEmail, subject, body) {
    const mailOptions = { from: `"Organizador de Boletos" <${process.env.EMAIL_FROM}>`, to: toEmail, subject: subject, html: body };
    await transporter.sendMail(mailOptions);
}


// =================================================================================
// Exportações (Atualizadas)
// =================================================================================
module.exports = {
    sendDailyReportEmail,
    sendContactFormEmail,
    sendPasswordResetEmail,
    sendVerificationEmail,
    sendGenericEmail,
    sendEmailFromTemplate
};