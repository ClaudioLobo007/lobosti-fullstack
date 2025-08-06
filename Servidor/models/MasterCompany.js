const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MasterCompanySchema = new Schema({
    nomeEmpresa: { type: String, required: true },
    cnpj: { type: String, required: true, unique: true },
    dbName: { type: String, required: true, unique: true },
    email: { type: String, default: '' },
    telefoneFixo: { type: String, default: '' },
    telefoneWhatsapp: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationExpires: { type: Date },
    subscription: {
        status: {
            type: String,
            enum: ['active', 'inactive', 'trial', 'past_due', 'pending_approval'],
            default: 'inactive'
        },
        endDate: { type: Date },
        mercadopagoPreapprovalId: { type: String, default: null },
    },
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
}, { 
    timestamps: true 
});

module.exports = {
    schema: MasterCompanySchema
};