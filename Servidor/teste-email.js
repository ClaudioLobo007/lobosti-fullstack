// D:\SCripts\SiteLobos\Servidor\teste-email.js

require('dotenv').config(); // Carrega as variáveis do seu ficheiro .env
const nodemailer = require('nodemailer');

// Função principal de teste
async function enviarEmailDeTeste() {
    console.log("--- A iniciar teste de envio de e-mail ---");
    console.log("A usar as configurações do seu ficheiro .env...");

    // 1. Criamos o "transportador" exatamente como no seu projeto
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true', 
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // Adiciona mais logs para depuração
        logger: true,
        debug: true 
    });

    // 2. Definimos os detalhes do e-mail de teste
    const mailOptions = {
        from: `"Teste LobosTI" <${process.env.EMAIL_FROM}>`,
        // IMPORTANTE: Coloque aqui um e-mail que você possa verificar
        to: 'claudio.lobo@lobosti.com.br', 
        subject: 'Teste de Envio de E-mail do Servidor',
        html: `
            <h1>Olá!</h1>
            <p>Este é um e-mail de teste enviado diretamente pelo script <strong>teste-email.js</strong>.</p>
            <p>Se você recebeu isto, a sua configuração do Nodemailer e as credenciais no ficheiro .env estão a funcionar corretamente.</p>
        `,
    };

    // 3. Tentamos enviar o e-mail
    try {
        console.log("A tentar enviar o e-mail...");
        let info = await transporter.sendMail(mailOptions);

        console.log("----------------------------------------------------");
        console.log("✅ SUCESSO! E-mail de teste enviado com sucesso!");
        console.log("ID da Mensagem:", info.messageId);
        console.log("Resposta do Servidor:", info.response);
        console.log("----------------------------------------------------");

    } catch (error) {
        console.log("----------------------------------------------------");
        console.error("❌ FALHA! Ocorreu um erro ao tentar enviar o e-mail:");
        console.error(error); // Imprime o erro detalhado
        console.log("----------------------------------------------------");
    }
}

// Executamos a função
enviarEmailDeTeste();