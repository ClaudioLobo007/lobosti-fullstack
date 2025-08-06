const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Importa o ESQUEMA do modelo, que será compilado na conexão de cada empresa.
const { schema: BoletoSchema } = require('../models/Boleto');

/**
 * Função de ajuda que analisa os parâmetros da query (startDate, endDate)
 * e retorna um objeto com as datas de início e fim para a filtragem.
 * Se nenhum parâmetro for fornecido, assume o mês corrente.
 * @param {object} query - O objeto req.query da rota.
 * @returns {{start: Date, end: Date}} - Um objeto com as datas de início e fim.
 */
function getDateRange(query) {
    const { startDate, endDate } = query;
    if (startDate && endDate) {
        return {
            start: new Date(startDate + 'T00:00:00.000Z'),
            end: new Date(endDate + 'T23:59:59.999Z')
        };
    }
    // Se não houver datas, o padrão é o mês atual.
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    return {
        start: new Date(Date.UTC(year, month, 1)),
        end: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
    };
}

/**
 * Constrói os estágios iniciais e comuns da pipeline de agregação para relatórios.
 * Inclui desestruturação de parcelas, filtragem por data e por status (pago/não pago).
 * @param {object} query - O objeto req.query da rota.
 * @returns {Array} Um array com os estágios da pipeline de agregação.
 */
function buildBasePipeline(query) {
    const dateRange = getDateRange(query);
    const { status } = query;

    let paidMatch = {};
    if (status === 'paid') {
        paidMatch = { 'parcels.paid': true };
    } else if (status === 'unpaid') {
        paidMatch = { 'parcels.paid': false };
    }

    // Retorna um array com os estágios de agregação que são comuns a várias rotas
    return [
        { $unwind: '$parcels' }, // "Desmonta" o array de parcelas, criando um documento para cada uma
        { $match: paidMatch },  // Filtra por status (pago/não pago/todos)
        { $addFields: { 'parcels.dueDateObject': { $toDate: '$parcels.dueDate' } } }, // Converte a data de string para objeto Date
        { $match: { 'parcels.dueDateObject': { $gte: dateRange.start, $lte: dateRange.end } } } // Filtra pelo período de tempo
    ];
}

// Rota: GET /api/reports/expenses-by-category
// Gera os dados para o gráfico de despesas por categoria.
router.get('/expenses-by-category', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        
        // 1. Obtém a pipeline de base com todos os filtros comuns.
        const basePipeline = buildBasePipeline(req.query);

        // 2. Adiciona os estágios de agregação que são específicos DESTA rota.
        const reportPipeline = [
            ...basePipeline, // Reutiliza os estágios comuns
            { $group: { _id: '$category', totalAmount: { $sum: '$parcels.amount' } } },
            { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'categoryDetails' } },
            { $project: { _id: 0, categoryName: { $ifNull: [ { $arrayElemAt: ['$categoryDetails.name', 0] }, 'Sem Categoria' ] }, totalAmount: '$totalAmount' } }
        ];

        const report = await Boleto.aggregate(reportPipeline);
        res.status(200).json(report);

    } catch (error) {
        console.error("Erro ao gerar relatório de despesas por categoria:", error);
        res.status(500).json({ message: "Erro interno ao gerar relatório." });
    }
});

// Rota: GET /api/reports/monthly-summary
// Gera os dados para o gráfico de resumo dos últimos meses.
router.get('/monthly-summary', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        
        // 1. Reutiliza a mesma função para obter a base da pipeline.
        const basePipeline = buildBasePipeline(req.query);

        // 2. Adiciona os estágios específicos para agrupar por mês/ano.
        const summaryPipeline = [
            ...basePipeline,
            { $group: { _id: { year: { $year: '$parcels.dueDateObject' }, month: { $month: '$parcels.dueDateObject' } }, totalAmount: { $sum: '$parcels.amount' } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ];

        const summary = await Boleto.aggregate(summaryPipeline);
        res.status(200).json(summary);

    } catch (error) {
        console.error("Erro ao gerar resumo mensal:", error);
        res.status(500).json({ message: "Erro interno ao gerar resumo." });
    }
});

// Rota: GET /api/reports/kpi-summary
// Gera os dados para os cartões principais (KPIs) do dashboard.
router.get('/kpi-summary', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const dateRange = getDateRange(req.query);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Query 1: Calcula os totais para o período selecionado.
        const periodTotals = await Boleto.aggregate([
            { $unwind: '$parcels' },
            { $addFields: { 'parcels.dueDateObject': { $toDate: '$parcels.dueDate' } } },
            { $match: { 'parcels.dueDateObject': { $gte: dateRange.start, $lte: dateRange.end } } },
            {
                $group: {
                    _id: null,
                    totalMes: { $sum: '$parcels.amount' },
                    pagoMes: { $sum: { $cond: [{ $eq: ['$parcels.paid', true] }, '$parcels.amount', 0] } }
                }
            }
        ]);
        
        // Query 2: Calcula o total GERAL de contas vencidas (não depende do período).
        const overdueTotal = await Boleto.aggregate([
            { $unwind: '$parcels' },
            { $addFields: { 'parcels.dueDateObject': { $toDate: '$parcels.dueDate' } } },
            { $match: { 
                'parcels.paid': false,
                'parcels.dueDateObject': { $lt: today }
            }},
            { $group: { _id: null, totalVencido: { $sum: '$parcels.amount' } } }
        ]);

        const kpis = {
            totalMes: periodTotals[0]?.totalMes || 0,
            pagoMes: periodTotals[0]?.pagoMes || 0,
            totalVencido: overdueTotal[0]?.totalVencido || 0,
        };

        res.status(200).json(kpis);

    } catch (error) {
        console.error("Erro ao gerar KPIs do dashboard:", error);
        res.status(500).json({ message: "Erro interno ao gerar resumo de KPIs." });
    }
});

// Rota: GET /api/reports/upcoming-payments
// Retorna as próximas 5 parcelas não pagas que estão para vencer.
router.get('/upcoming-payments', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const upcoming = await Boleto.aggregate([
            { $unwind: '$parcels' },
            { $addFields: { 'parcels.dueDateObject': { $toDate: '$parcels.dueDate' } } },
            { $match: {
                'parcels.paid': false,
                'parcels.dueDateObject': { $gte: today }
            }},
            { $sort: { 'parcels.dueDateObject': 1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    billName: '$name',
                    parcelNumber: '$parcels.number',
                    amount: '$parcels.amount',
                    dueDate: '$parcels.dueDate'
                }
            }
        ]);

        res.status(200).json(upcoming);

    } catch (error) {
        console.error("Erro ao buscar próximos vencimentos:", error);
        res.status(500).json({ message: "Erro interno ao buscar próximos vencimentos." });
    }
});

module.exports = router;