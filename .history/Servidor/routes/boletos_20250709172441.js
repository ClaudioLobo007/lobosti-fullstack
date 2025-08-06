const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { protect } = require('../middleware/authMiddleware');
const { logAction } = require('../middleware/logMiddleware');

// ================================================================
// Rota para CRIAR um novo boleto (Create)
// Por padrão, todos os usuários podem criar boletos.
// ================================================================
router.post('/', protect, logAction, async (req, res) => {
    try {
        const { name, parcels } = req.body;
        const { companyId, id: userId } = req.user;

        if (!name || !parcels || parcels.length === 0) {
            return res.status(400).json({ message: 'Dados do boleto ou das parcelas estão faltando.' });
        }
        
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        const user = company.usuarios.id(userId);
        if (!user) return res.status(404).json({ message: "Usuário não encontrado na empresa." });
        
        const newBoleto = {
            id: `boleto-${Date.now()}`,
            parentId: `boleto-${Date.now()}`,
            name,
            ownerUsername: user.username,
            parcels: parcels
        };

        user.boletos.push(newBoleto);
        await company.save();
        res.status(201).json({ message: 'Boleto criado com sucesso!', boleto: newBoleto });
    } catch (error) {
        console.error("Erro ao criar boleto:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ================================================================
// Rota para LER os boletos da empresa (Read)
// Todos os usuários da empresa podem ver todos os boletos.
// ================================================================
router.get('/', protect, async (req, res) => {
    try {
        const { companyId } = req.user;
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });
        
        const allCompanyBoletos = company.usuarios.flatMap(user => user.boletos);
        res.status(200).json(allCompanyBoletos);
    } catch (error) {
        console.error("Erro ao buscar boletos da empresa:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// ================================================================
// Rota para ATUALIZAR uma parcela específica (Update)
// ================================================================
router.patch('/:boletoId/parcels/:parcelId', protect, logAction, async (req, res) => {
    try {
        const { companyId, role } = req.user;
        const { boletoId, parcelId } = req.params;
        const { paid, amount, dueDate, description, barcode } = req.body;

        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        // <<< VERIFICAÇÃO DE PERMISSÃO ADICIONADA >>>
        // Se o usuário não for proprietário E não tiver permissão para atualizar, bloqueia a ação.
        if (role !== 'Proprietário' && !company.permissions[role]?.canUpdate) {
            return res.status(403).json({ message: 'Você não tem permissão para editar boletos.' });
        }

        let boletoToUpdate, parcelToUpdate;
        for (const user of company.usuarios) {
            boletoToUpdate = user.boletos.find(b => b.id === boletoId);
            if (boletoToUpdate) {
                parcelToUpdate = boletoToUpdate.parcels.find(p => p.id === parcelId);
                if (parcelToUpdate) break;
            }
        }
        if (!parcelToUpdate) return res.status(404).json({ message: "Parcela não encontrada." });
        
        if (paid !== undefined) parcelToUpdate.paid = paid;
        if (amount !== undefined) parcelToUpdate.amount = amount;
        if (dueDate !== undefined) parcelToUpdate.dueDate = dueDate;
        if (description !== undefined) parcelToUpdate.description = description;
        if (barcode !== undefined) parcelToUpdate.barcode = barcode;
        
        company.markModified('usuarios');
        await company.save();
        res.status(200).json({ message: 'Parcela atualizada com sucesso!', parcel: parcelToUpdate });
    } catch (error) {
        console.error("Erro ao atualizar parcela:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ================================================================
// Rota para EXCLUIR uma parcela específica (Delete)
// ================================================================
router.delete('/:boletoId/parcels/:parcelId', protect, logAction, async (req, res) => {
    try {
        const { companyId, role } = req.user;
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        // <<< VERIFICAÇÃO DE PERMISSÃO ADICIONADA >>>
        if (role !== 'Proprietário' && !company.permissions[role]?.canDelete) {
            return res.status(403).json({ message: 'Você não tem permissão para excluir boletos.' });
        }
        
        const { boletoId, parcelId } = req.params;
        let userOwner, boletoToUpdate;
        for (const user of company.usuarios) {
            const foundBoleto = user.boletos.find(b => b.id === boletoId);
            if (foundBoleto) { userOwner = user; boletoToUpdate = foundBoleto; break; }
        }
        if (!boletoToUpdate) return res.status(404).json({ message: "Boleto não encontrado." });

        const originalParcelCount = boletoToUpdate.parcels.length;
        boletoToUpdate.parcels = boletoToUpdate.parcels.filter(p => p.id !== parcelId);
        
        if (boletoToUpdate.parcels.length < originalParcelCount && boletoToUpdate.parcels.length === 0) {
            userOwner.boletos = userOwner.boletos.filter(b => b.id !== boletoId);
        }
        
        await company.save();
        res.status(200).json({ message: 'Parcela excluída com sucesso!' });
    } catch (error) {
        console.error("Erro ao excluir parcela:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// ================================================================
// Rota para EXCLUIR um BOLETO INTEIRO
// ================================================================
router.delete('/:boletoId', protect, logAction, async (req, res) => {
    try {
        const { companyId, role } = req.user;
        const { boletoId } = req.params;
        const company = await Company.findById(companyId);
        if (!company) return res.status(404).json({ message: "Empresa não encontrada." });

        // <<< VERIFICAÇÃO DE PERMISSÃO ADICIONADA >>>
        if (role !== 'Proprietário' && !company.permissions[role]?.canDelete) {
            return res.status(403).json({ message: 'Você não tem permissão para excluir boletos.' });
        }

        const userOwner = company.usuarios.find(user => user.boletos.some(boleto => boleto.id === boletoId));
        if (!userOwner) return res.status(404).json({ message: "Boleto não encontrado." });

        userOwner.boletos = userOwner.boletos.filter(b => b.id !== boletoId);
        
        await company.save();
        res.status(200).json({ message: 'Boleto completo excluído com sucesso!' });
    } catch (error) {
        console.error("Erro ao excluir o boleto completo:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

module.exports = router;