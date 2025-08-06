const MasterCompanySchema = require('../models/MasterCompany').schema;

// CORREÇÃO: Importamos a função para OBTER a conexão mestre, além da de tenant
const { getTenantConnection, getMasterConnection } = require('../config/db');

const tenantMiddleware = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'SuperAdmin') {
            return next();
        }
        
        if (!req.user || !req.user.companyId) {
            return res.status(401).json({ message: 'Informações de usuário ou empresa ausentes no token.' });
        }

        // --- CORREÇÃO PRINCIPAL AQUI ---
        // 1. Obtém a conexão Mestre que já está ativa.
        const masterDb = getMasterConnection();
        // 2. Compila o modelo MasterCompany usando essa conexão.
        const MasterCompany = masterDb.model('MasterCompany', MasterCompanySchema);
        // --- FIM DA CORREÇÃO ---

        // 3. Agora a busca será feita na conexão correta, sem timeout.
        const company = await MasterCompany.findById(req.user.companyId);
        if (!company || !company.dbName) {
            return res.status(404).json({ message: 'Empresa não encontrada no registro mestre.' });
        }

        req.tenantDb = await getTenantConnection(company.dbName);
        req.company = company;
        next();

    } catch (error) {
        console.error("Erro no middleware de tenant:", error);
        return res.status(500).json({ message: 'Erro ao processar a requisição da empresa.' });
    }
};

module.exports = { tenantMiddleware };