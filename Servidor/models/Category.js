const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true // O nome da categoria agora é único dentro do banco da empresa
    }
});

module.exports = {
    schema: CategorySchema
};