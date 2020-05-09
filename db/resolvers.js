const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path:'variables.env'});

const crearToken = (usuario, secreta, expiresIn) => {
    const {id, email, nombre, apellido} = usuario;
    return jwt.sign({id, email, nombre, apellido}, secreta, {expiresIn} );
};

//Resolvers
const resolvers= {
    Query : {
        obtenerUsuario : async (_, {}, ctx) => {
            if(!ctx.usuario) return null;
            return ctx.usuario;
        },
        obtenerProductos : async () => {
            try {
                return await Producto.find({});
            } catch (error) {
                console.error(error);
            }
        },
        obtenerProducto : async (_, {id}) => {
            const producto = await Producto.findById(id);
            if(!producto){
                throw new Error('Producto no encontrado');
            }
            return producto;
        },
        obtenerClientes: async () => {
            try {
                return await Cliente.find({});
            } catch (error) {
                console.error(error);
            }
        },
        obtenerClientesVendedor : async (_,{}, ctx) =>{
            try {
                if(!ctx.usuario) return null;
                const vendedor = ctx.usuario.id;
                return await Cliente.find({vendedor});
            } catch (error) {
                console.error(error);
            }
        },
        obtenerCliente : async (_, {id}, ctx) => {
            const cliente = await Cliente.findById(id);
            if(!cliente){
                throw new Error('Cliente no encontrado');
            }
            const vendedor = ctx.usuario.id;
            if(cliente.vendedor.toString() !== vendedor){
                throw new Error('No tienes las credenciales')
            }
            return cliente;
        },
        obtenerPedidos : async () => {
            try {
                return await Pedido.find({});
            } catch (error) {
                console.error(error);
            }
        },
        obtenerPedidosVendedor : async (_,{}, ctx) => {
            try {
                if(!ctx.usuario) return null;
                const vendedor = ctx.usuario.id;
                return await Pedido.find({vendedor}).populate('cliente');
            } catch (error) {
                console.error(error);
            }
        },
        obtenerPedido : async(_,{id}, ctx) => {
            const pedido = await Pedido.findById(id);
            if(!pedido){
                throw new Error('Pedido no encontrado');
            }
            const vendedor = ctx.usuario.id;
            if(pedido.vendedor.toString() !== vendedor){
                throw new Error('No tienes las credenciales')
            }
            return pedido;
        },
        obtenerPedidosEstado : async (_, {estado}, ctx) => {
            const pedidos = await Pedido.find({vendedor: ctx.usuario.id, estado})

            return pedidos;
        },
        mejoresClientes : async () => {
            return await Pedido.aggregate([
                {$match: {estado: "COMPLETADO"}},
                {$group:{ _id: "$cliente", total : {$sum: "$total"} }},
                {$lookup:{
                    from: "clientes",
                    localField: "_id",
                    foreignField: "_id",
                    as: "cliente"
                }},
                {$limit: 10},
                {$sort: {total:-1}}
            ]);
        },
        mejoresVendedores : async () => {
            return await Pedido.aggregate([
                {$match: {estado: "COMPLETADO"}},
                {$group:{ _id: "$vendedor", total : {$sum: "$total"} }},
                {$lookup:{
                    from: "usuarios",
                    localField: "_id",
                    foreignField: "_id",
                    as: "vendedor"
                }},
                {$limit: 10},
                {$sort: {total:-1}}
            ]);
        },
        buscarProducto : async (_, {texto}) => {
            return await Producto.find({$text:{$search:texto}});
        }
    },
    Mutation: {
        nuevoUsuario: async (_, {input}) => {
            const {email, password} = input;

            const existeUsuario = await Usuario.findOne({email});

            if(existeUsuario){
                throw new Error('El usuario ya está registrado');
            }

            const salt = await bcryptjs.genSalt(10);

            input.password = await bcryptjs.hash(password, salt);

            try {
                const usuario = new Usuario(input);
                usuario.save();
                return usuario;
            } catch (error) {
                
            }
            return "Creando...";
        },
        autenticarUsuario: async (_, {input}) => {
            const {email, password} = input;

            const existeUsuario = await Usuario.findOne({email});

            if(!existeUsuario){
                throw new Error('El usuario no existe');
            }
            
            const passCorrecto = await bcryptjs.compare(password, existeUsuario.password);
            if(!passCorrecto){
                throw new Error('El password no es correcto!!');
                
            }
            return {token : crearToken(existeUsuario, process.env.SECRETA, '24hr')}
        },
        nuevoProducto: async (_, {input}) => {
            try {
                const newProducto = new Producto(input);
                return await newProducto.save();
            } catch (error) {
                console.error(error);
            }
        },
        actualizarProducto : async (_, {id, input}) => {
            let producto = await Producto.findById(id);
            if(!producto){
                throw new Error('Producto no encontrado');
            }
            return await Producto.findOneAndUpdate({_id: id}, input, {new:true});
        },
        eliminarProducto : async (_, {id}) => {
            let producto = await Producto.findById(id);
            if(!producto){
                throw new Error('Producto no encontrado');
            }

            await Producto.findOneAndDelete({_id:id});

            return "Producto Eliminado!!";
        },
        nuevoCliente : async (_, {input}, ctx) => {
            const {usuario} = ctx;
            const cliente = await Cliente.findOne({email: input.email});
            if(cliente){
                throw new Error('El cliente ya se encuentra registrado');
            }
            const newCliente = new Cliente(input);
            newCliente.vendedor = usuario.id;

            try {
                return await newCliente.save();
            } catch (error) {
                console.error(error);
            }
        },
        actualizarCliente : async (_, {id, input}, ctx) => {
            let cliente = await Cliente.findById(id);
            if(!cliente){
                throw new Error('Cliente no encontrado');
            }
            const vendedor = ctx.usuario.id;
            if(cliente.vendedor.toString() !== vendedor){
                throw new Error('No tienes las credenciales')
            }

            return await Cliente.findOneAndUpdate({_id: id}, input, {new:true});
        },
        eliminarCliente : async (_, {id}, ctx) => {
            let cliente = await Cliente.findById(id);
            if(!cliente){
                throw new Error('Cliente no encontrado');
            }

            const vendedor = ctx.usuario.id;
            if(cliente.vendedor.toString() !== vendedor){
                throw new Error('No tienes las credenciales')
            }

            await Cliente.findOneAndDelete({_id:id});

            return "Cliente Eliminado!!";
        },
        nuevoPedido : async (_, {input}, ctx) => {
            const {cliente} = input;
            let clienteExiste = await Cliente.findById(cliente);

            if(!clienteExiste){
                throw new Error('Cliente no existe');
            }

            const vendedor = ctx.usuario.id;
            if(clienteExiste.vendedor.toString() !== vendedor){
                throw new Error('No tienes las credenciales')
            }

            for await (const articulo of input.pedido) {
                const {id} = articulo;

                const producto = await Producto.findById(id);
                if(articulo.cantidad > producto.existencia){
                    throw new Error(`El articulo: ${producto.nombre} excede la cantidad disponible`);
                }else{
                    producto.existencia -= articulo.cantidad;
                    producto.save();
                }
            }

            const newPedido = new Pedido(input);
            newPedido.vendedor = vendedor;
            return await newPedido.save();
        },
        actualizarPedido : async (_, {id, input}, ctx) => {
            const {cliente} = input;

            const pedidoExiste = await Pedido.findById(id);
            if(!pedidoExiste){
                throw new Error('Pedido no existe');
            }

            const clienteExiste = await Cliente.findById(cliente);
            if(!clienteExiste){
                throw new Error('Cliente no existe');
            }

            const vendedor = ctx.usuario.id;
            if(clienteExiste.vendedor.toString() !== vendedor){
                throw new Error('No tienes las credenciales')
            }
            if(input.pedido){
                for await (const articulo of input.pedido) {
                    const {id} = articulo;
    
                    const producto = await Producto.findById(id);
                    if(articulo.cantidad > producto.existencia){
                        throw new Error(`El articulo: ${producto.nombre} excede la cantidad disponible`);
                    }else{
                        producto.existencia -= articulo.cantidad;
                        producto.save();
                    }
                }
            }

            return await Pedido.findOneAndUpdate({_id:id}, input, {new:true});
        },
        eliminarPedido : async (_, {id}, ctx) => {
            let pedidoExiste = await Pedido.findById(id);
            if(!pedidoExiste){
                throw new Error('Pedido no encontrado');
            }

            const vendedor = ctx.usuario.id;
            if(pedidoExiste.vendedor.toString() !== vendedor){
                throw new Error('No tienes las credenciales')
            }

            await Pedido.findOneAndDelete({_id:id});

            return "Pedido Eliminado!!";
        }
    }
}


module.exports = resolvers;