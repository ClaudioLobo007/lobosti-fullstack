const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
    name: { // Um nome único para identificar o template, ex: 'passwordReset'
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    subject: { // O assunto do e-mail
        type: String,
        required: true
    },
    body: { // O corpo do e-mail (pode conter HTML e placeholders)
        type: String,
        required: true
    }
}, { timestamps: true });

// Exportamos apenas o schema, para manter a consistência com os seus outros modelos
module.exports = {
    schema: EmailTemplateSchema
};