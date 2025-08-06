const express = require('express');
const router = express.Router();
const { schema: MasterCompanySchema } = require('../models/MasterCompany');
const { authorize } = require('../middleware/authMiddleware');


// Rota para LER as permissões atuais da empresa
router.get('/', async (req, res) => {
    try {
        // CORREÇÃO: Compilamos o modelo usando a conexão Mestre ativa
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);

        const company = await MasterCompany.findById(req.user.companyId);
        if (!company) {
            return res.status(404).json({ message: "Empresa não encontrada." });
        }
        res.status(200).json(company.permissions);
    } catch (error) {
        console.error("Erro ao buscar permissões:", error);
        res.status(500).json({ message: 'Erro ao buscar permissões.' });
    }
});

// Rota para ATUALIZAR as permissões
router.patch('/', authorize('Proprietário'), async (req, res) => {
    try {
        // O restante do seu código, que já está correto, permanece aqui.
        const MasterCompany = req.masterDb.model('MasterCompany', MasterCompanySchema);
        
        const newPermissions = req.body;
        const company = await MasterCompany.findById(req.user.companyId);
        if (!company) {
            return res.status(404).json({ message: "Empresa não encontrada." });
        }

        company.permissions = newPermissions;
        await company.save();
        
        res.status(200).json({ message: `Permissões da empresa atualizadas com sucesso.` });
    } catch (error) {
        console.error("Erro ao salvar permissões: ", error);
        res.status(500).json({ message: 'Erro ao atualizar permissões.' });
    }
});

module.exports = router;