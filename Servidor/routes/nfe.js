const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // O 'fetch' no backend precisa de ser importado
const { protect } = require('../middleware/authMiddleware');

// Rota: GET /api/nfe/:chave
// Recebe uma chave de 44 dígitos e busca os dados na API da NFE.io
router.get('/:chave', protect, async (req, res) => {
    try {
        const chaveNfe = req.params.chave;
        const apiKey = process.env.NFE_API_KEY;

        if (!chaveNfe || chaveNfe.length !== 44) {
            return res.status(400).json({ message: 'Chave de NFe inválida. A chave deve conter 44 dígitos.' });
        }

        const apiUrl = `https://api.nfe.io/v1/nfe/${chaveNfe}?apiKey=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const responseBody = await response.text();

        if (!response.ok) {
            if (response.status === 404 || response.status === 403) {
                return res.status(404).json({ message: 'NFe não encontrada ou não disponível para consulta.' });
            }
            throw new Error(responseBody || `Erro ${response.status} ao consultar a NFe.`);
        }
        
        const nfeData = JSON.parse(responseBody);

        const dadosParaBoleto = {
            // Prioriza o Nome Fantasia, se não houver, usa a Razão Social.
            nome: `NFe - ${nfeData.issuer?.tradeName || nfeData.issuer?.name || 'Fornecedor Desconhecido'}`,
            
            // Prioriza o valor líquido da fatura, se não houver, usa o valor total da nota.
            valorTotal: nfeData.billing?.bill?.netAmount || nfeData.totals?.icms?.invoiceAmount || 0.00,
            
            // Prioriza a data de vencimento da primeira duplicata, se não houver, usa a data de emissão.
            vencimento: nfeData.billing?.duplicates?.[0]?.expirationOn?.split('T')[0] || nfeData.issuedOn?.split('T')[0]
        };

        res.status(200).json(dadosParaBoleto);

    } catch (error) {
        console.error("Erro ao buscar NFe:", error.message);
        res.status(500).json({ message: error.message || 'Erro interno ao consultar a NFe.' });
    }
});

module.exports = router;