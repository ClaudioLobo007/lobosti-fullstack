const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// CORREÇÃO: Importamos os ESQUEMAS, e não os modelos compilados
const { schema: MasterCompanySchema } = require('../models/MasterCompany');
const { schema: MasterUserSchema } = require('../models/MasterUser');
const { schema: UserSchema } = require('../models/User');

// Importamos a função de conexão do nosso arquivo de configuração
const { getTenantConnection } = require('../config/db');


// ROTA DE CRIAÇÃO DE EMPRESA (Apenas SuperAdmin, via painel)
// Corresponde a POST /api/companies/
router.post('/', async (req, res) => {
    // A proteção já é garantida pelo middleware no server.js
    if (req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ message: 'Acesso negado.' });
    }

    try {
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);

        const { nomeEmpresa, cnpj, ownerUsername, ownerPassword, email } = req.body;
        
        const cleanCnpj = cnpj.replace(/\D/g, '');
        if (await MasterCompany.findOne({ cnpj: cleanCnpj })) {
            return res.status(400).json({ message: 'Este CNPJ já está cadastrado.' });
        }

        const dbName = `empresa_${cleanCnpj}`;
        const newMasterCompany = await MasterCompany.create({ nomeEmpresa, cnpj: cleanCnpj, dbName, email });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ownerPassword, salt);
        
        await MasterUser.create({
            username: ownerUsername,
            email: email,
            password: hashedPassword,
            role: 'Proprietário',
            company: newMasterCompany._id
        });

        const tenantDb = await getTenantConnection(dbName);
        const TenantUser = tenantDb.model('User', require('../models/User').schema);
        
        await TenantUser.create({
            username: ownerUsername,
            password: hashedPassword, 
            role: 'Proprietário',
            email: email || 'proprietario@email.com'
        });

        res.status(201).json({ 
            message: 'Empresa e usuário proprietário criados com sucesso!',
            company: newMasterCompany
        });

    } catch (error) {
        console.error("Erro ao criar nova empresa (admin):", error);
        const cleanCnpj = req.body.cnpj.replace(/\D/g, '');
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);
        await MasterCompany.deleteOne({ cnpj: cleanCnpj });
        await MasterUser.deleteOne({ username: req.body.ownerUsername });
        res.status(500).json({ message: 'Erro interno do servidor ao criar empresa.' });
    }
});


// Rota para LER TODAS as empresas
router.get('/', async (req, res) => {
    try {
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const companies = await MasterCompany.find({});
        res.status(200).json(companies);
    } catch (error) {
        console.error("Erro ao listar empresas:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para LER os detalhes de UMA empresa e seus usuários
router.get('/:id', async (req, res) => {
    try {
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);
        
        const company = await MasterCompany.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: "Empresa não encontrada." });
        }

        const tenantDb = await getTenantConnection(company.dbName);
        const TenantUser = tenantDb.model('User', require('../models/User').schema);
        const users = await TenantUser.find({}).select('-password');
        
        const masterUsers = await MasterUser.find({ company: req.params.id }).select('-password');
        
        res.status(200).json({ company, users, masterUsers });

    } catch (error) {
        console.error("Erro ao buscar detalhes da empresa:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para ATUALIZAR OS DADOS de uma empresa
router.patch('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'SuperAdmin' && req.user.companyId !== req.params.id) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const updateData = req.body;

        const updatedCompany = await MasterCompany.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!updatedCompany) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }

        res.status(200).json({
            message: "Dados da empresa atualizados com sucesso!",
            company: updatedCompany
        });

    } catch (error) {
        console.error("Erro ao atualizar dados da empresa:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para EXCLUIR uma empresa inteira
router.delete('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'SuperAdmin') {
            return res.status(403).json({ message: 'Acesso negado.' });
        }
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);
        const companyId = req.params.id;

        const companyToDelete = await MasterCompany.findById(companyId);
        if (!companyToDelete) {
            return res.status(404).json({ message: "Empresa não encontrada." });
        }
        const dbName = companyToDelete.dbName;

        const tenantDb = await getTenantConnection(dbName);
        await tenantDb.dropDatabase();
        
        await MasterUser.deleteMany({ company: companyId });
        await MasterCompany.findByIdAndDelete(companyId);
        
        res.status(200).json({ message: 'Empresa e todos os seus dados foram excluídos com sucesso!' });
    } catch (error) {
        console.error("Erro ao excluir empresa:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para ADICIONAR tempo de assinatura
router.patch('/:id/subscription', async (req, res) => {
    if (req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ message: 'Acesso negado.' });
    }
    try {
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const { daysToAdd } = req.body;
        const days = parseInt(daysToAdd, 10);
        if (!days || days <= 0) {
            return res.status(400).json({ message: 'Forneça um número de dias válido.' });
        }
        const company = await MasterCompany.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }
        const today = new Date();
        const currentEndDate = company.subscription.endDate && company.subscription.endDate > today
            ? company.subscription.endDate
            : today;
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + days);
        company.subscription.status = 'active';
        company.subscription.endDate = newEndDate;
        await company.save();
        res.status(200).json({ message: `${days} dias de assinatura adicionados!`, company });
    } catch (error) {
        console.error("Erro ao adicionar tempo de assinatura:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para REMOVER a assinatura
router.delete('/:id/subscription', async (req, res) => {
    if (req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ message: 'Acesso negado.' });
    }
    try {
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        const company = await MasterCompany.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }
        company.subscription.status = 'inactive';
        company.subscription.endDate = undefined;
        await company.save();
        res.status(200).json({ message: `Assinatura removida.`, company });
    } catch (error) {
        console.error("Erro ao remover assinatura:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para ATUALIZAR O CARGO (ROLE) de um usuário
router.patch('/:companyId/users/:userId/role', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { role } = req.body;
        if (!role || !['Proprietário', 'Gerente', 'Funcionário'].includes(role)) {
            return res.status(400).json({ message: 'Cargo inválido.' });
        }
        
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema);
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        
        const masterUser = await MasterUser.findByIdAndUpdate(userId, { role }, { new: true });
        if (!masterUser) {
            return res.status(404).json({ message: 'Usuário não encontrado no registro mestre.' });
        }

        const company = await MasterCompany.findById(companyId);
        const tenantDb = await getTenantConnection(company.dbName);
        const TenantUser = tenantDb.model('User', require('../models/User').schema);
        
        await TenantUser.findOneAndUpdate({ username: masterUser.username }, { role });

        res.status(200).json({ message: `Cargo do usuário ${masterUser.username} atualizado para ${role}!` });
    } catch (error) {
        console.error("Erro ao atualizar cargo do usuário:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ROTA PÚBLICA DE CADASTRO (SELF-SERVICE)
router.post('/register-company', async (req, res) => {
    try {
        // Esta rota usa o masterDbMiddleware, então req.masterDb está disponível
        const MasterCompany = req.masterDb.model('MasterCompany', require('../models/MasterCompany').schema);
        const MasterUser = req.masterDb.model('MasterUser', require('../models/MasterUser').schema);

        const { nomeEmpresa, cnpj, email, telefoneWhatsapp, username, ownerEmail, password } = req.body;

        // Validações
        if (!nomeEmpresa || !cnpj || !email || !username || !password) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios." });
        }
        if (await MasterCompany.findOne({ cnpj })) {
            return res.status(400).json({ message: 'Este CNPJ já está cadastrado.' });
        }
        if (await MasterUser.findOne({ email: ownerEmail })) {
            return res.status(400).json({ message: 'Este e-mail de proprietário já está em uso.' });
        }

        const dbName = `empresa_${cnpj}`;
        const newMasterCompany = await MasterCompany.create({ nomeEmpresa, cnpj, dbName, email, telefoneWhatsapp });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await MasterUser.create({
            username: username,
            password: hashedPassword,
            role: 'Proprietário',
            company: newMasterCompany._id
        });

        const tenantDb = await getTenantConnection(dbName);
        const TenantUser = tenantDb.model('User', require('../models/User').schema);

        await TenantUser.create({
            username,
            password: hashedPassword, 
            role: 'Proprietário',
            email: ownerEmail
        });

        res.status(201).json({ message: 'Empresa e usuário proprietário cadastrados com sucesso!' });

    } catch (error) {
        console.error("Erro no cadastro self-service:", error);
        res.status(500).json({ message: 'Erro interno no servidor durante o cadastro.' });
    }
});

// Rota para EXCLUIR um usuário de uma empresa (SuperAdmin ou Proprietário)
router.delete('/:companyId/users/:userId', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { role: requesterRole, companyId: requesterCompanyId } = req.user;

        // Modelos do banco Mestre
        const MasterCompany = req.masterDb.model('MasterCompany', require('../models/MasterCompany').schema);
        const MasterUser = req.masterDb.model('MasterUser', MasterUserSchema); // Usa o schema importado

        // 1. Verificação de Autorização:
        // - Apenas SuperAdmin pode excluir qualquer usuário de qualquer empresa.
        // - Proprietário pode excluir usuários da SUA PRÓPRIA empresa, exceto a si mesmo.
        if (requesterRole !== 'SuperAdmin') {
            if (requesterRole === 'Proprietário' && requesterCompanyId.toString() === companyId) {
                // Proprietário tentando excluir usuário da própria empresa
                const userToDelete = await MasterUser.findById(userId);
                if (!userToDelete) {
                    return res.status(404).json({ message: 'Usuário não encontrado.' });
                }
                if (userToDelete.role === 'Proprietário') {
                    // Proprietário não pode excluir outro proprietário (para evitar ficar sem acesso)
                    // ou a si mesmo (se for o único proprietário).
                    // Esta lógica pode ser mais complexa se houver vários proprietários.
                    return res.status(403).json({ message: 'Proprietários não podem excluir outros proprietários ou a si mesmos.' });
                }
            } else {
                return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para remover usuários de outras empresas.' });
            }
        }

        // 2. Encontra a empresa no banco Mestre para obter o nome do seu DB Tenant
        const company = await MasterCompany.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: "Empresa não encontrada no registro mestre." });
        }

        // 3. Exclui o usuário do banco Mestre
        const masterUserDeleted = await MasterUser.findByIdAndDelete(userId);
        if (!masterUserDeleted) {
            return res.status(404).json({ message: 'Usuário não encontrado no registro mestre para exclusão.' });
        }
        console.log(`[COMPANY ROUTE] Usuário ${masterUserDeleted.username} (${masterUserDeleted._id}) excluído do Master DB.`);

        // 4. Exclui o usuário do banco de dados da empresa (Tenant)
        const tenantDb = await getTenantConnection(company.dbName);
        const TenantUser = tenantDb.model('User', UserSchema); // Usa o schema importado

        const tenantUserDeleted = await TenantUser.findOneAndDelete({ username: masterUserDeleted.username }); // Exclui pelo username
        if (tenantUserDeleted) {
            console.log(`[COMPANY ROUTE] Usuário ${tenantUserDeleted.username} (${tenantUserDeleted._id}) excluído do DB do tenant ${company.dbName}.`);
        } else {
            console.log(`[COMPANY ROUTE] Aviso: Usuário ${masterUserDeleted.username} não encontrado no DB do tenant ${company.dbName} para exclusão (já havia sido removido?).`);
        }

        res.status(200).json({ message: 'Usuário removido com sucesso!' });

    } catch (error) {
        console.error("Erro ao remover usuário da empresa:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao remover o usuário.' });
    }
});


module.exports = router;