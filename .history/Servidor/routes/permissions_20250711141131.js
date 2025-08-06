const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { protect } = require('../middleware/authMiddleware');

// GET para ler as permissões
router.get('/', protect, async (req, res) => {
    try {
        const company = await Company.findById(req.user.companyId);
        res.status(200).json(company.permissions);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar permissões.' });
    }
});

// PATCH para atualizar as permissões
router.patch('/', protect, async (req, res) => {
    if (req.user.role !== 'Proprietário') {
        return res.status(403).json({ message: 'Apenas proprietários podem alterar permissões.' });
    }
    try {
        const { roleToUpdate, permissions } = req.body;
        const company = await Company.findById(req.user.companyId);
        company.permissions[roleToUpdate] = { ...company.permissions[roleToUpdate], ...permissions };
        await company.save();
        res.status(200).json({ message: `Permissões para '${roleToUpdate}' atualizadas.` });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar permissões.' });
    }
});

module.exports = router;