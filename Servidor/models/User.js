const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true }, // Agora o username é único dentro da empresa
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true
    },
    password: { type: String, required: true },
    role: { type: String, enum: ['Proprietário', 'Gerente', 'Funcionário'], default: 'Funcionário' },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
});

module.exports = {
    schema: UserSchema
};