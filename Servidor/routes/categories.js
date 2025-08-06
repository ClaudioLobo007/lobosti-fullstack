const express = require('express');
const router = express.Router();

const { schema: CategorySchema } = require('../models/Category');
const { schema: BoletoSchema } = require('../models/Boleto');

// Rota para LER todas as categorias de uma empresa
router.get('/', async (req, res) => {
    try {
        const Category = req.tenantDb.model('Category', CategorySchema);
        const categories = await Category.find({}).sort({ name: 1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar categorias.' });
    }
});

// Rota para CRIAR uma nova categoria
router.post('/', async (req, res) => {
    try {
        // A lógica de permissão (req.user.role) continua a mesma
        if (req.user.role !== 'Proprietário') {
            return res.status(403).json({ message: 'Apenas proprietários podem criar categorias.' });
        }
        const Category = req.tenantDb.model('Category', CategorySchema);
        const { name } = req.body;
        const newCategory = await Category.create({ name });
        res.status(201).json(newCategory);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Uma categoria com este nome já existe.' });
        }
        res.status(500).json({ message: 'Erro ao criar categoria.' });
    }
});

// Rota para ATUALIZAR uma categoria
router.patch('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'Proprietário') {
            return res.status(403).json({ message: 'Apenas proprietários podem editar categorias.' });
        }
        const Category = req.tenantDb.model('Category', CategorySchema);
        const { name } = req.body;
        const updatedCategory = await Category.findOneAndUpdate(
            { _id: req.params.id },
            { name },
            { new: true }
        );
        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar categoria.' });
    }
});

// Rota para APAGAR uma categoria
router.delete('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'Proprietário') {
            return res.status(403).json({ message: 'Apenas proprietários podem apagar categorias.' });
        }
        const Category = req.tenantDb.model('Category', CategorySchema);
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);

        // Antes de apagar, remove a categoria de todos os boletos que a usam
        await Boleto.updateMany({ category: req.params.id }, { $set: { category: null } });
        await Category.findOneAndDelete({ _id: req.params.id });
        res.status(200).json({ message: 'Categoria apagada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao apagar categoria.' });
    }
});

module.exports = router;