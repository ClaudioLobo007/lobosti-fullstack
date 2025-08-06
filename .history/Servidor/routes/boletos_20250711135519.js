const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { protect } = require('../middleware/authMiddleware');
const { logAction } = require('../middleware/logMiddleware');

// Rota para CRIAR um novo boleto
router.post('/', protect, logAction, async (req, res) => {
    try {
        const { name, parcels } = req.body;
        const { companyId, id: userId } = req.user; // Usando o ID do usuário

        if (!name || !parcels || parcels.length === 0) {
            return res.status(400).json({ message: 'Dados do boleto ou das parcelas estão faltando.' });
        }
        
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        const user = company.usuarios.id(userId);
        if (!user) return res.status(404).json({ message: "Usuário não encontrado na empresa." });
        
        // Adiciona o ID do dono em cada boleto
        const newBoleto = {
            id: `boleto-${Date.now()}`,
            parentId: `boleto-${Date.now()}`,
            name,
            ownerId: user._id, // <<< MUDANÇA IMPORTANTE: Armazenando o ID do dono
            ownerUsername: user.username,
            parcels: parcels
        };

        user.boletos.push(newBoleto);
        await company.save();
        res.status(201).json({ message: 'Boleto criado com sucesso!', boleto: newBoleto });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para LER os boletos da empresa
router.get('/', protect, async (req, res) => {
    try {
        const { companyId } = req.user;
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });
        
        const allCompanyBoletos = company.usuarios.flatMap(user => user.boletos);
        res.status(200).json(allCompanyBoletos);
    } catch (error) {
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// Rota para ATUALIZAR uma parcela específica
router.patch('/:boletoId/parcels/:parcelId', protect, logAction, async (req, res) => {
    try {
        const { companyId, role, id: loggedInUserId } = req.user; // Pegando o ID do usuário logado
        const { boletoId, parcelId } = req.params;
        const { paid, amount, dueDate, description, barcode } = req.body;

        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        let boletoToUpdate, parcelToUpdate;
        for (const user of company.usuarios) {
            boletoToUpdate = user.boletos.find(b => b.id === boletoId);
            if (boletoToUpdate) {
                parcelToUpdate = boletoToUpdate.parcels.find(p => p.id === parcelId);
                if (parcelToUpdate) break;
            }
        }
        if (!parcelToUpdate) return res.status(404).json({ message: "Parcela não encontrada." });

        // <<< LÓGICA DE PERMISSÃO CORRIGIDA >>>
        const permissionLevel = company.permissions[role]?.canUpdate;
        const isOwner = boletoToUpdate.ownerId.toString() === loggedInUserId; // Comparando IDs

        if (role !== 'Proprietário') {
            if (permissionLevel === 'none' || (permissionLevel === 'own' && !isOwner)) {
                return res.status(403).json({ message: 'Você não tem permissão para editar esta parcela.' });
            }
        }

        if (paid !== undefined) parcelToUpdate.paid = paid;
        if (amount !== undefined) parcelToUpdate.amount = amount;
        if (dueDate !== undefined) parcelToUpdate.dueDate = dueDate;
        if (description !== undefined) parcelToUpdate.description = description;
        if (barcode !== undefined) parcelToUpdate.barcode = barcode;
        
        company.markModified('usuarios'); 
        await company.save();

        res.status(200).json({ message: 'Parcela atualizada com sucesso!', parcel: parcelToUpdate });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para EXCLUIR uma PARCELA específica
router.delete('/:boletoId/parcels/:parcelId', protect, logAction, async (req, res) => {
    try {
        const { companyId, role, id: loggedInUserId } = req.user; // Pegando o ID
        const { boletoId, parcelId } = req.params;

        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        const userOwner = company.usuarios.find(user => user.boletos.some(b => b.id === boletoId));
        if (!userOwner) return res.status(404).json({ message: "Boleto não encontrado." });
        
        const boleto = userOwner.boletos.find(b => b.id === boletoId);
        const parcelIndex = boleto.parcels.findIndex(p => p.id === parcelId);

        if (parcelIndex === -1) return res.status(404).json({ message: "Parcela não encontrada." });

        // <<< LÓGICA DE PERMISSÃO CORRIGIDA >>>
        const permissionLevel = company.permissions[role]?.canDelete;
        const isOwner = boleto.ownerId.toString() === loggedInUserId; // Comparando IDs

        if (role !== 'Proprietário') {
            if (permissionLevel === 'none' || (permissionLevel === 'own' && !isOwner)) {
                return res.status(403).json({ message: 'Você não tem permissão para excluir esta parcela.' });
            }
        }

        boleto.parcels.splice(parcelIndex, 1);
        company.markModified('usuarios');
        await company.save();
        res.status(200).json({ message: 'Parcela excluída com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para EXCLUIR um BOLETO INTEIRO
router.delete('/:boletoId', protect, logAction, async (req, res) => {
    try {
        const { companyId, role, id: loggedInUserId } = req.user; // Pegando o ID
        const { boletoId } = req.params;
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        const userOwner = company.usuarios.find(user => user.boletos.some(b => b.id === boletoId));
        if (!userOwner) return res.status(404).json({ message: "Boleto não encontrado." });

        const boletoToDelete = userOwner.boletos.find(b => b.id === boletoId);
        
        // <<< LÓGICA DE PERMISSÃO CORRIGIDA >>>
        const permissionLevel = company.permissions[role]?.canDelete;
        const isOwner = boletoToDelete.ownerId.toString() === loggedInUserId; // Comparando IDs

        if (role !== 'Proprietário') {
            if (permissionLevel === 'none' || (permissionLevel === 'own' && !isOwner)) {
                return res.status(403).json({ message: 'Você não tem permissão para excluir este boleto.' });
            }
        }

        userOwner.boletos = userOwner.boletos.filter(b => b.id !== boletoId);
        await company.save();
        res.status(200).json({ message: 'Boleto completo excluído com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

module.exports = router;