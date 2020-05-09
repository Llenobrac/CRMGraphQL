const mongoose = require('mongoose');

const PedidosSchema = mongoose.Schema({
    pedido : {type: Array, require: true},
    total: {type: Number, require: true},
    cliente: {type: mongoose.Schema.Types.ObjectId, ref:'Cliente', require: true},
    vendedor: {type: mongoose.Schema.Types.ObjectId, ref:'Usuario', require: true},
    estado: {type: String, default: "PENDIENTE"},
    creado: {type: Date, default: Date.now()}
});

module.exports = mongoose.model('Pedido', PedidosSchema);