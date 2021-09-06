const mongosse = require('mongoose');

const ProductosSchema = mongosse.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    existencia: {
        type: Number,
        required: true,
        trim: true
    },
    precio: {
        type: Number,
        required: true,
        trim: true
    },
    creado: {
        type: Date,
        default: Date.now()
    }
});

//Crear un indice para la búsqueda de productos
ProductosSchema.index({nombre: 'text'});

module.exports = mongosse.model('Producto', ProductosSchema);