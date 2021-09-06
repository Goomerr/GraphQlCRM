const mongosse = require('mongoose');

const ClienteSchema = mongosse.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    apellido: {
        type: String,
        required: true,
        trim: true
    },
    empresa: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    telefono: {
        type: String,
        trim: true,
    },
    creado: {
        type: Date,
        default: Date.now()
    },
    vendedor: {
        type: mongosse.Schema.Types.ObjectId,
        required: true,
        ref: 'Usuario'
    }
});

module.exports = mongosse.model('Cliente', ClienteSchema);