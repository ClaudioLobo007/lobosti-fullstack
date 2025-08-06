const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { protect } = require('../middleware/authMiddleware');

// Rota para LER as permissões atuais da empresa
router.get('/', protect, async (req, res) => {
    try {
        const company = await Company.findById(req.user.companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        res.status(200).json(company.permissions);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar permissões." });
    }
});

// Rota para ATUALIZAR as permissões de um papel
router.patch('/', protect, async (req, res) => {
    // Apenas o Proprietário pode alterar permissões
    if (req.user.role !== 'Proprietário') {
        return res.status(403).json({ message: 'Apenas proprietários podem alterar permissões.' });
    }

    try {
        const { roleToUpdate, permissions } = req.body; // Ex: { roleToUpdate: 'Funcionário', permissions: { canDelete: true } }

        const company = await Company.findById(req.user.companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        // Atualiza as permissões para o papel especificado
        company.permissions[roleToUpdate] = { ...company.permissions[roleToUpdate], ...permissions };

        company.markModified('permissions');
        await company.save();

        res.status(200).json({ message: `Permissões para '${roleToUpdate}' atualizadas.` });

    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar permissões.' });
    }
});

module.exports = router;