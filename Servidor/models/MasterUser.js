const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MasterUserSchema = new Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['Proprietário', 'Gerente', 'Funcionário'], 
        required: true 
    },

    company: { 
        type: Schema.Types.ObjectId, 
        ref: 'MasterCompany',
        required: true 
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
}, { timestamps: true });

MasterUserSchema.index({ username: 1, company: 1 }, { unique: true });

module.exports = {
    schema: MasterUserSchema
};