// Em servidor/routes/contact.js

const express = require('express');
const router = express.Router();
// Importamos o nosso serviço de e-mail que já está a funcionar
const { sendContactFormEmail } = require('../services/emailService');

// Rota que ouve por requisições POST em /api/contact/send
router.post('/send', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validação simples no servidor
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        // Chama a nova função do nosso serviço de e-mail
        await sendContactFormEmail(name, email, subject, message);

        res.status(200).json({ message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.' });

    } catch (error) {
        console.error("Erro ao enviar e-mail de contato:", error);
        res.status(500).json({ message: 'Ocorreu um erro ao tentar enviar a mensagem.' });
    }
});

module.exports = router;