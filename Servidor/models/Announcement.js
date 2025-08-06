const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AnnouncementSchema = new Schema({
    message: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    link: { type: String, default: '' } // Um link opcional, se quiser direcionar o utilizador
}, {
    timestamps: true // Para sabermos quando foi criado
});

module.exports = {
    schema: AnnouncementSchema
};