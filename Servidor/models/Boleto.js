const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BoletoSchema = new Schema({
    name: { type: String, required: true },
    nfeNumber: { type: String },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    // O campo 'company' foi removido daqui
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    parcels: [{
        number: { type: Number, required: true },
        amount: { type: Number, required: true },
        dueDate: { type: String, required: true },
        paid: { type: Boolean, default: false },
        description: { type: String },
        barcode: { type: String },
        attachmentUrl: { type: String, default: null }
    }]
});

// Garante que o modelo só seja compilado uma vez
module.exports = {
    schema: BoletoSchema
};