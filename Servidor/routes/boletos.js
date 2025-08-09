const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Importamos os ESQUEMAS, que serão usados para compilar os modelos em cada conexão
const { schema: BoletoSchema } = require('../models/Boleto');
const { schema: CategorySchema } = require('../models/Category');
const { schema: UserSchema } = require('../models/User');

// Importamos o serviço de upload
const { upload, deleteFile } = require('../services/uploadService');

// LINHA ADICIONADA PARA CORRIGIR O ERRO
const { protect } = require('../middleware/authMiddleware');

// --- ROTAS ESPECÍFICAS E DE AÇÕES EM MASSA (DEVEM VIR PRIMEIRO) ---

// Rota para LER todos os boletos da empresa
router.get('/', async (req, res) => {
    try {
        // Registramos TODOS os modelos que a rota vai usar na conexão do tenant
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        req.tenantDb.model('User', UserSchema);
        req.tenantDb.model('Category', CategorySchema);

        const allCompanyBoletos = await Boleto.find({})
            .populate('user', 'username role') // O .populate() encontrará o modelo 'User'
            .populate('category', 'name')     // E também o modelo 'Category'
            .sort({ 'parcels.dueDate': 1 });

        res.status(200).json(allCompanyBoletos);
    } catch (error) {
        console.error("Erro ao buscar boletos da empresa:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// Rota para CRIAR um novo boleto
router.post('/', async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);

        if (role !== 'Proprietário') {
            const canCreate = req.company.permissions[role]?.canCreate;
            if (!canCreate) {
                return res.status(403).json({ message: 'Você não tem permissão para criar novos boletos.' });
            }
        }
        
        const { name, parcels, description, barcode, nfeNumber, category } = req.body;
        
        const newBoleto = await Boleto.create({
            name,
            nfeNumber,
            category: category || null,
            parcels,
            description,
            barcode,
            user: userId
        });

        res.status(201).json({ message: 'Boleto criado com sucesso!', boleto: newBoleto });
    } catch (error) {
        console.error("Erro ao criar boleto:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para importar boletos em lote (CSV)
router.post('/batch-import', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const Category = req.tenantDb.model('Category', CategorySchema);
        const { boletos } = req.body;
        const { id: userId } = req.user;

        if (!boletos || !Array.isArray(boletos) || boletos.length === 0) {
            return res.status(400).json({ message: 'Nenhum dado de boleto válido foi recebido.' });
        }

        let boletosCriados = 0;
        for (const item of boletos) {
            const keys = Object.keys(item);
            const findKey = (name) => keys.find(k => k.toLowerCase() === name.toLowerCase().trim());
            
            const nfeCode = String(item[findKey('CodNFE')] || '').trim();
            const categoriaNome = String(item[findKey('Categoria')] || '').trim();
            const pagoValor = String(item[findKey('Pago')] || 'nao').toLowerCase().trim();
            
            let categoriaId = null;
            if (categoriaNome) {
                let categoria = await Category.findOne({ name: categoriaNome });
                if (!categoria) {
                    categoria = await Category.create({ name: categoriaNome });
                }
                categoriaId = categoria._id;
            }

            const isPaid = ['sim', 's', 'true', '1'].includes(pagoValor);
            const nome = String(item[findKey('Nome')] || 'Sem Nome').trim();
            const dataValue = String(item[findKey('Data')] || '').trim();
            const valorNumerico = parseFloat(String(item[findKey('Valor')] || '0').replace(',', '.')) || 0;
            const parcelaKey = findKey('Parcela');
            const parcelaValue = parcelaKey ? item[parcelaKey] : '1/1';
            const parcelaString = String(parcelaValue || '1/1').trim();
            const numeroDaParcela = parseInt(parcelaString.split('/')[0]) || 1;

            let dia, mes, ano;
            if (dataValue.includes('/')) { [dia, mes, ano] = dataValue.split('/'); } 
            else if (dataValue.includes('-')) { [ano, mes, dia] = dataValue.split('-'); } 
            else { continue; }
            if (!dia || !mes || !ano || isNaN(parseInt(dia)) || isNaN(parseInt(mes)) || isNaN(parseInt(ano)) || String(ano).length < 4) { continue; }
            const dataFormatada = `${ano.trim()}-${String(mes).trim().padStart(2, '0')}-${String(dia).trim().padStart(2, '0')}`;
            
            const parcelaUnica = {
                number: numeroDaParcela,
                amount: valorNumerico,
                dueDate: dataFormatada,
                paid: isPaid,
                description: `Parcela: ${parcelaString} | Tipo: ${String(item[findKey('Tipo')] || 'N/A').trim()}`
            };

            await Boleto.create({
                name: nome,
                nfeNumber: nfeCode || null,
                category: categoriaId,
                user: userId,
                parcels: [parcelaUnica]
            });
            boletosCriados++;
        }
        
        const message = `Importação concluída. ${boletosCriados} boletos foram criados.`;
        res.status(201).json({ message });

    } catch (error) {
        console.error("ERRO NA IMPORTAÇÃO:", error);
        res.status(500).json({ message: 'Ocorreu um erro interno no servidor durante a importação.' });
    }
});

// Rota para marcar parcelas como pagas em massa
router.patch('/parcels/mark-as-paid', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const { parcelIds } = req.body;

        if (!parcelIds || !Array.isArray(parcelIds) || parcelIds.length === 0) {
            return res.status(400).json({ message: 'Nenhuma parcela selecionada.' });
        }

        const result = await Boleto.updateMany(
            { 
                // 1. Encontra os boletos que contêm QUALQUER uma das parcelas selecionadas
                "parcels._id": { $in: parcelIds } 
            },
            { 
                // 2. Define 'paid' como true para as parcelas que correspondem ao filtro de array
                $set: { "parcels.$[elem].paid": true } 
            },
            { 
                // 3. O filtro de array, que diz para o Mongoose qual 'elem' atualizar
                // A CORREÇÃO ESTÁ AQUI: garantindo que é "elem._id"
                arrayFilters: [{ "elem._id": { $in: parcelIds } }] 
            }
        );

        res.status(200).json({ message: `${result.modifiedCount} parcelas foram marcadas como pagas com sucesso!` });

    } catch (error) {
        console.error("Erro ao marcar parcelas em massa:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar as parcelas.' });
    }
});

// Rota para REMOVER O PAGAMENTO de parcelas em massa
router.patch('/parcels/mark-as-unpaid', async (req, res) => {
    try {
        // 1. Obtém o modelo 'Boleto' da conexão de banco de dados específica desta empresa (tenant)
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);

        // 2. Extrai a lista de IDs de parcelas do corpo da requisição enviada pelo frontend
        const { parcelIds } = req.body;

        // 3. Validação para garantir que recebemos uma lista válida de parcelas
        if (!parcelIds || !Array.isArray(parcelIds) || parcelIds.length === 0) {
            return res.status(400).json({ message: 'Nenhuma parcela selecionada para remover o pagamento.' });
        }

        // 4. Executa a atualização no banco de dados
        // - Procura todos os boletos que contenham parcelas com os IDs fornecidos
        // - Altera o campo 'paid' para 'false' nessas parcelas específicas
        await Boleto.updateMany(
            { 
                "parcels._id": { $in: parcelIds } 
            },
            { 
                // A única mudança em relação à rota de "pagar": definimos 'paid' como 'false'
                $set: { "parcels.$[elem].paid": false } 
            },
            { 
                arrayFilters: [{ "elem._id": { $in: parcelIds } }] 
            }
        );

        // 5. Envia uma resposta de sucesso para o frontend
        res.status(200).json({ message: 'Pagamento removido das parcelas selecionadas com sucesso!' });

    } catch (error) {
        // 6. Em caso de qualquer erro, envia uma resposta de erro genérica
        console.error("Erro ao remover pagamento de parcelas em massa:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar as parcelas.' });
    }
});

// Rota para alterar categoria em massa
router.patch('/bulk-update-category', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const { boletoIds, categoryId } = req.body;
        if (!boletoIds || !Array.isArray(boletoIds) || boletoIds.length === 0) {
            return res.status(400).json({ message: 'Nenhum boleto selecionado.' });
        }
        const validBoletoIds = boletoIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validBoletoIds.length === 0) {
             return res.status(400).json({ message: 'Nenhum ID de boleto válido foi fornecido.' });
        }
        const newCategoryId = categoryId ? new mongoose.Types.ObjectId(categoryId) : null;
        const result = await Boleto.updateMany(
            { "_id": { $in: validBoletoIds } },
            { $set: { "category": newCategoryId } }
        );
        res.status(200).json({ message: `Categoria de ${result.modifiedCount} boletos foi atualizada com sucesso!` });
    } catch (error) {
        console.error("Erro ao alterar categoria em massa:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar categorias.' });
    }
});

// Rota para atualizar parcelas em massa (somente esta, futuras ou todas)
router.patch('/bulk-update-parcels', protect, async (req, res) => {
    try {
        const { boletoId, parcelId, updatedData, scope } = req.body;
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);

        const boleto = await Boleto.findById(boletoId);
        if (!boleto) {
            return res.status(404).json({ message: "Boleto não encontrado." });
        }

        const parcelIndex = boleto.parcels.findIndex(p => p._id.toString() === parcelId);
        if (parcelIndex === -1) {
            return res.status(404).json({ message: "Parcela original não encontrada." });
        }

        // Define os campos que podem ser atualizados em massa
        const fieldsToUpdate = {
            amount: updatedData.amount,
            description: updatedData.description,
            barcode: updatedData.barcode
        };

        // Extrai o NOVO DIA da data que foi alterada
        const newDay = new Date(updatedData.dueDate + 'T00:00:00').getUTCDate();

        switch (scope) {
            case 'single':
                // Para "Somente esta", atualiza todos os campos da parcela específica
                Object.assign(boleto.parcels[parcelIndex], updatedData);
                break;

            case 'future':
            case 'all':
                const startIndex = (scope === 'future') ? parcelIndex : 0;

                for (let i = startIndex; i < boleto.parcels.length; i++) {
                    // 1. Atualiza os campos comuns (valor, descrição, etc.)
                    Object.assign(boleto.parcels[i], fieldsToUpdate);

                    // 2. Lógica inteligente para a data
                    const currentParcelDate = new Date(boleto.parcels[i].dueDate + 'T00:00:00');
                    const year = currentParcelDate.getUTCFullYear();
                    const month = currentParcelDate.getUTCMonth();

                    // Cria uma nova data mantendo o mês/ano, mas com o novo dia
                    let newDate = new Date(Date.UTC(year, month, newDay));

                    // Se o novo dia for inválido para o mês (ex: dia 31 em Fevereiro),
                    // ajusta para o último dia válido daquele mês.
                    if (newDate.getUTCMonth() !== month) {
                        newDate = new Date(Date.UTC(year, month + 1, 0)); 
                    }

                    boleto.parcels[i].dueDate = newDate.toISOString().split('T')[0];
                }

                // 3. O status de "pago" é uma exceção e só se aplica à parcela que foi editada
                boleto.parcels[parcelIndex].paid = updatedData.paid;
                break;

            default:
                return res.status(400).json({ message: "Escopo de atualização inválido." });
        }

        await boleto.save();
        res.status(200).json({ message: 'Parcelas atualizadas com sucesso!', boleto });

    } catch (error) {
        console.error("Erro na atualização em massa de parcelas:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});


// --- ROTAS DE ITENS ESPECÍFICOS (MAIS GENÉRICAS, DEVEM VIR DEPOIS) ---

// Rota para ATUALIZAR um boleto (ex: categoria de um boleto único)
router.patch('/:id', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const updatedBoleto = await Boleto.findOneAndUpdate({ _id: req.params.id }, { $set: req.body }, { new: true });
        res.status(200).json(updatedBoleto);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar boleto.' });
    }
});

// Rota para EXCLUIR um BOLETO INTEIRO
router.delete('/:boletoId', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const { role, id: loggedInUserId, impersonator } = req.user;
        const { boletoId } = req.params;
        const boleto = await Boleto.findById(boletoId);
        if (!boleto) return res.status(404).json({ message: "Boleto não encontrado." });
        
        if (!impersonator) {
            const permissionLevel = req.company.permissions[role]?.canDelete;
            const isOwner = boleto.user.toString() === loggedInUserId;
            if (role !== 'Proprietário' && (permissionLevel === 'none' || (permissionLevel === 'own' && !isOwner))) {
                return res.status(403).json({ message: 'Você não tem permissão para excluir este boleto.' });
            }
        }
        await Boleto.findByIdAndDelete(boletoId);
        res.status(200).json({ message: 'Boleto completo excluído com sucesso!' });
    } catch (error) {
        console.error("Erro ao excluir o boleto completo:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para ATUALIZAR uma parcela específica
router.patch('/:boletoId/parcels/:parcelId', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const { role, id: loggedInUserId, impersonator } = req.user;
        const { boletoId, parcelId } = req.params;
        const updateData = req.body;

        const boleto = await Boleto.findById(boletoId);
        if (!boleto) {
            return res.status(404).json({ message: "Boleto não encontrado." });
        }

        const parcelToUpdate = boleto.parcels.id(parcelId);
        if (!parcelToUpdate) return res.status(404).json({ message: "Parcela não encontrada." });

        if (!impersonator) {
            const permissionLevel = req.company.permissions[role]?.canUpdate;
            const isOwner = boleto.user.toString() === loggedInUserId;

            if (role !== 'Proprietário' && (permissionLevel === 'none' || (permissionLevel === 'own' && !isOwner))) {
                return res.status(403).json({ message: 'Você não tem permissão para editar esta parcela.' });
            }
        }

        Object.assign(parcelToUpdate, updateData);
        await boleto.save();
        res.status(200).json({ message: 'Parcela atualizada com sucesso!', boleto });
    } catch (error) {
        console.error("Erro ao atualizar parcela:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para EXCLUIR uma PARCELA específica
router.delete('/:boletoId/parcels/:parcelId', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const { role, id: loggedInUserId, impersonator } = req.user;
        const { boletoId, parcelId } = req.params;
        const boleto = await Boleto.findById(boletoId);
        if (!boleto) return res.status(404).json({ message: "Boleto não encontrado." });
        const parcelToDelete = boleto.parcels.id(parcelId);
        if (!parcelToDelete) return res.status(404).json({ message: "Parcela não encontrada." });
        if (!impersonator) {
            const permissionLevel = req.company.permissions[role]?.canDelete;
            const isOwner = boleto.user.toString() === loggedInUserId;
            if (role !== 'Proprietário' && (permissionLevel === 'none' || (permissionLevel === 'own' && !isOwner))) {
                return res.status(403).json({ message: 'Você não tem permissão para excluir esta parcela.' });
            }
        }
        parcelToDelete.deleteOne();
        await boleto.save();
        res.status(200).json({ message: 'Parcela excluída com sucesso!' });
    } catch (error) {
        console.error("Erro ao excluir parcela:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rotas para ANEXOS
router.post('/:boletoId/parcels/:parcelId/attach', upload.single('comprovante'), async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const { boletoId, parcelId } = req.params;
        if (!req.file) return res.status(400).json({ message: 'Nenhum ficheiro foi enviado.' });
        await Boleto.updateOne({ "_id": boletoId, "parcels._id": parcelId }, { "$set": { "parcels.$.attachmentUrl": req.file.location } });
        res.status(200).json({ message: 'Comprovativo anexado com sucesso!', attachmentUrl: req.file.location });
    } catch (error) {
        console.error("Erro ao salvar o anexo no banco de dados:", error);
        res.status(500).json({ message: 'Erro interno ao salvar o anexo.' });
    }
});

router.delete('/:boletoId/parcels/:parcelId/attach', async (req, res) => {
    try {
        const Boleto = req.tenantDb.model('Boleto', BoletoSchema);
        const { boletoId, parcelId } = req.params;
        const boleto = await Boleto.findOne({ "_id": boletoId, "parcels._id": parcelId }, { 'parcels.$': 1 });
        if (!boleto || !boleto.parcels[0] || !boleto.parcels[0].attachmentUrl) {
            return res.status(404).json({ message: "Anexo não encontrado." });
        }
        const fileKey = boleto.parcels[0].attachmentUrl.split('/').pop();
        await deleteFile(fileKey);
        await Boleto.updateOne({ "_id": boletoId, "parcels._id": parcelId }, { "$set": { "parcels.$.attachmentUrl": null } });
        res.status(200).json({ message: 'Comprovativo removido com sucesso!' });
    } catch (error) {
        console.error("Erro ao remover comprovativo:", error);
        res.status(500).json({ message: 'Erro interno ao remover o ficheiro.' });
    }
});

module.exports = router;