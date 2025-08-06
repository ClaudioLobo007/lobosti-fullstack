// D:\SCripts\SiteLobos\Servidor\tests\seed.js

const { schema: EmailTemplateSchema } = require('../models/EmailTemplate');

/**
 * Insere os dados essenciais na base de dados de teste.
 * @param {mongoose.Connection} dbConnection - A conexão ativa com a base de dados de teste.
 */
const seedDatabase = async (dbConnection) => {
    // A MUDANÇA ESTÁ AQUI: Usamos a conexão fornecida para criar o modelo.
    const EmailTemplate = dbConnection.model('EmailTemplate', EmailTemplateSchema);

    // O resto da função continua igual.
    await EmailTemplate.create([
        {
            name: 'emailVerification',
            subject: 'Verifique o seu e-mail',
            body: '<h1>Bem-vindo!</h1><p>Clique aqui para verificar: {{verificationLink}}</p>'
        },
        {
            name: 'passwordReset',
            subject: 'Recuperação de Senha',
            body: '<h1>Recuperação</h1><p>Clique aqui para redefinir: {{resetLink}}</p>'
        },
        {
            name: 'dailyReport',
            subject: 'Relatório Diário de Boletos',
            body: '<h1>Relatório para {{companyName}}</h1><div>{{parcelsHtml}}</div>'
        }
    ]);

    console.log('🌱 Base de dados de teste semeada com templates de e-mail.');
};

module.exports = { seedDatabase };