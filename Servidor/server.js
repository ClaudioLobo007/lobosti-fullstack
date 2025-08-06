require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// 1. IMPORTA A LÓGICA DE CONEXÃO E O MODELO MESTRE NECESSÁRIO
const { connectToMasterDB, getMasterConnection, closeAllConnections } = require('./config/db');
const MasterCompany = require('./models/MasterCompany');

const app = express();

const cron = require('node-cron');
const { getTenantConnection } = require('./config/db'); // Já deve ter esta
const { sendDailyReportEmail } = require('./services/emailService');
const BoletoSchema = require('./models/Boleto').schema;
const announcementRoutes = require('./routes/announcements');

// 2. MIDDLEWARES GERAIS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. IMPORTAÇÃO DE TODAS AS ROTAS E MIDDLEWARES DE AUTENTICAÇÃO
const { protect } = require('./middleware/authMiddleware');
const { tenantMiddleware } = require('./middleware/tenantMiddleware');
const { checkSubscription } = require('./middleware/subscriptionMiddleware');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/company');
const boletoRoutes = require('./routes/boletos');
const permissionsRoutes = require('./routes/permissions');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');
const paymentsRouter = require('./routes/payments');
const nfeRoutes = require('./routes/nfe');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');
const exportRoutes = require('./routes/export');

const { initCronJobs } = require('./services/cronJobs'); 

// 4. MIDDLEWARE PARA PASSAR A CONEXÃO MESTRE PARA AS ROTAS
const masterDbMiddleware = (req, res, next) => {
    req.masterDb = getMasterConnection();
    next();
};

// 5. APLICAÇÃO DAS ROTAS COM SEUS RESPECTIVOS MIDDLEWARES
app.get('/', (req, res) => {
    res.send('API do Organizador de Boletos está no ar!');
});

// Rate Limiter para o login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Aumentado para permitir mais testes
    message: { message: 'Muitas tentativas de login deste IP. Por favor, tente novamente após 15 minutos.' },
});
app.use('/api/auth/login', loginLimiter);

// --- IMPORTANTE: GARANTA QUE O WEBHOOK VENHA ANTES DA ROTA /api/payments PROTEGIDA ---

// Rota PÚBLICA do Webhook: Registrada primeiro, sem 'protect'.
// O paymentsRouter contém a rota '/webhook' que será agora acessível publicamente através deste prefixo.
app.use('/api/payments', masterDbMiddleware, paymentsRouter);

// Rotas públicas (ex: contato)
app.use('/api/contact', contactRoutes);

// Rotas que usam o banco de dados MESTRE E SÃO PROTEGIDAS
app.use('/api/auth', masterDbMiddleware, authRoutes); // Auth tem rotas públicas e protegidas
app.use('/api/admin', protect, masterDbMiddleware, adminRoutes);
app.use('/api/companies', protect, masterDbMiddleware, companyRoutes);
app.use('/api/permissions', protect, masterDbMiddleware, permissionsRoutes);
app.use('/api/announcements', protect, masterDbMiddleware, announcementRoutes);


// Rotas que usam o banco de dados da EMPRESA (TENANT)
app.use('/api/boletos', protect, tenantMiddleware, checkSubscription, boletoRoutes);
app.use('/api/categories', protect, tenantMiddleware, checkSubscription, categoryRoutes);
app.use('/api/reports', protect, tenantMiddleware, checkSubscription, reportRoutes);
app.use('/api/export', protect, tenantMiddleware, checkSubscription, exportRoutes);
app.use('/api/nfe', protect, nfeRoutes); // NFe não usa nosso banco, só precisa de proteção

// --- NOVO BLOCO: LÓGICA DE DESLIGAMENTO GRACIOSO ---
const cleanup = (signal) => {
    console.log(`\nSinal ${signal} recebido. A fechar as conexões com o banco de dados...`);
    closeAllConnections().then(() => {
        console.log('Todas as conexões foram fechadas. O servidor será desligado.');
        process.exit(0);
    });
};

// Ouve os sinais de interrupção (como Ctrl+C) e terminação
process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));

const startServer = async () => {
    await connectToMasterDB();
    initCronJobs();
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
        console.log(`Servidor a rodar na porta ${PORT}`);
    });
    return server;
};

if (require.main === module) {
    startServer();
}

module.exports = app;