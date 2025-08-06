const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define a estrutura de um boleto e suas parcelas
const BoletoSchema = new Schema({
    id: { type: String, required: true },
    parentId: { type: String, required: true },
    name: { type: String, required: true },
    ownerUsername: { type: String, required: true },
    parcels: [{
        id: { type: String, required: true },
        number: { type: Number, required: true },
        amount: { type: Number, required: true },
        dueDate: { type: String, required: true },
        paid: { type: Boolean, default: false },
        description: { type: String },
        barcode: { type: String } 
    }]
});

// Define a estrutura de um usuário
const UserSchema = new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Proprietário', 'Gerente', 'Funcionário'], default: 'Funcionário' },
    boletos: [BoletoSchema]
});

// Define a estrutura principal da empresa
const CompanySchema = new Schema({
    nomeEmpresa: { type: String, required: true },
    cnpj: { type: String, required: true, unique: true },
    senhaEmpresa: { type: String, required: true },
    usuarios: [UserSchema],
    permissions: {
        Gerente: {
            canCreate: { type: Boolean, default: true },
            canUpdate: { type: String, enum: ['none', 'own', 'all'], default: 'all' },
            canDelete: { type: String, enum: ['none', 'own', 'all'], default: 'all' }
        },
        Funcionário: {
            canCreate: { type: Boolean, default: true },
            canUpdate: { type: String, enum: ['none', 'own', 'all'], default: 'none' },
            canDelete: { type: String, enum: ['none', 'own', 'all'], default: 'none' }
        }
    }
});

// Exporta o modelo para ser usado em outras partes da aplicação
module.exports = mongoose.model('Company', CompanySchema);