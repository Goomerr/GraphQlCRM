const mongosse = require('mongoose');

const PedidosSchema = mongosse.Schema({
    pedido: {
        type: Array,
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
    cliente: {
        type: mongosse.Schema.Types.ObjectId,
        required: true,
        ref: 'Cliente'
    },
    vendedor: {
        type: mongosse.Schema.Types.ObjectId,
        required: true,
        ref: 'Usuario'
    },
    estado: {
        type: String,
        default: "PENDIENTE"
    },
    creado: {
        type: Date,
        default: Date.now()
    }
});

module.exports = mongosse.model('Pedidos', PedidosSchema);