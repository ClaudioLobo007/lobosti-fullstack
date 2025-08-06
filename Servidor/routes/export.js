const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { createObjectCsvStringifier } = require('csv-writer');
const PDFDocument = require('pdfkit');

// Importa o ESQUEMA do modelo
const { schema: BoletoSchema } = require('../models/Boleto');

// A função getDateRange não muda
function getDateRange(query) {
    const { startDate, endDate } = query;
    if (startDate && endDate) {
        return {
            start: new Date(startDate + 'T00:00:00.000Z'),
            end: new Date(endDate + 'T23:59:59.999Z')
        };
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    return {
        start: new Date(Date.UTC(year, month, 1)),
        end: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
    };
}

// A função getReportData agora recebe 'tenantDb' em vez de 'companyId'
async function getReportData(tenantDb, dateRange) {
    // Obtém o modelo 'Boleto' a partir da conexão da empresa
    const Boleto = tenantDb.model('Boleto', BoletoSchema);

    return await Boleto.aggregate([
        // { $match: { company: companyId } }, // <-- LINHA REMOVIDA
        { $unwind: '$parcels' },
        { $addFields: { 'parcels.dueDateObject': { $toDate: '$parcels.dueDate' } } },
        { $match: { 'parcels.dueDateObject': { $gte: dateRange.start, $lte: dateRange.end } } },
        { $sort: { 'parcels.dueDateObject': 1 } },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryDetails' } },
        {
            $project: {
                _id: 0,
                Data: '$parcels.dueDate',
                Nome: '$name',
                Parcela: '$parcels.number',
                Categoria: { $ifNull: [ { $arrayElemAt: ['$categoryDetails.name', 0] }, 'N/A' ] },
                Valor: '$parcels.amount',
                Status: { $cond: [{ $eq: ['$parcels.paid', true] }, 'Pago', 'Pendente'] }
            }
        }
    ]);
}

// Rota: GET /api/export/csv
router.get('/csv', async (req, res) => {
    try {
        const dateRange = getDateRange(req.query);
        // Passa a conexão 'req.tenantDb' para a função
        const data = await getReportData(req.tenantDb, dateRange);

        const records = data.map(item => ({
            Data: item.Data || '',
            Nome: item.Nome || 'N/A',
            Parcela: item.Parcela || '',
            Categoria: item.Categoria || 'N/A',
            Valor: (item.Valor || 0).toFixed(2).replace('.', ','),
            Status: item.Status || 'N/A'
        }));

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'Data', title: 'DATA' },
                { id: 'Nome', title: 'NOME' },
                { id: 'Parcela', title: 'PARCELA' },
                { id: 'Categoria', title: 'CATEGORIA' },
                { id: 'Valor', title: 'VALOR' },
                { id: 'Status', title: 'STATUS' }
            ],
            fieldDelimiter: ';',
        });

        const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

        res.setHeader('Content-Disposition', 'attachment; filename="relatorio-despesas.csv"');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');

        res.status(200).send(csvString);

    } catch (error) {
        console.error("Erro ao gerar CSV:", error);
        res.status(500).send("Erro ao gerar o relatório em CSV.");
    }
});

// Rota: GET /api/export/pdf
router.get('/pdf', async (req, res) => {
    try {
        const dateRange = getDateRange(req.query);
        // Passa a conexão 'req.tenantDb' para a função
        const data = await getReportData(req.tenantDb, dateRange);

        res.setHeader('Content-Disposition', 'attachment; filename="relatorio-despesas.pdf"');
        res.setHeader('Content-Type', 'application/pdf');

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        doc.pipe(res);

        // O restante da lógica de criação do PDF continua exatamente a mesma
        doc.fontSize(18).text('Relatório de Despesas', { align: 'center' });
        const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const periodStr = `${dateRange.start.toLocaleDateString('pt-BR', dateOptions)} a ${dateRange.end.toLocaleDateString('pt-BR', dateOptions)}`;
        doc.fontSize(10).text(`Período: ${periodStr}`, { align: 'center' });
        doc.moveDown(2);

        const tableTop = doc.y;
        const colPositions = [30, 90, 240, 340, 420, 500];
        const headers = ['Data', 'Nome', 'Parcela', 'Categoria', 'Valor', 'Status'];
        headers.forEach((header, i) => {
            doc.fontSize(10).font('Helvetica-Bold').text(header, colPositions[i], tableTop);
        });
        doc.moveTo(30, doc.y + 5).lineTo(565, doc.y + 5).stroke();
        doc.moveDown();

        data.forEach(item => {
            const rowY = doc.y;
            doc.fontSize(9).font('Helvetica').text(item.Data, colPositions[0], rowY);
            doc.text(item.Nome, colPositions[1], rowY, { width: 140, ellipsis: true });
            doc.text(String(item.Parcela), colPositions[2], rowY);
            doc.text(item.Categoria, colPositions[3], rowY);
            doc.text(item.Valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), colPositions[4], rowY, { align: 'right' });
            doc.text(item.Status, colPositions[5], rowY);
            doc.moveDown();
        });

        doc.end();

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        res.status(500).send("Erro ao gerar o relatório em PDF.");
    }
});

module.exports = router;