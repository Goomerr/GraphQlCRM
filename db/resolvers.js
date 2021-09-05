const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedidos = require('../models/Pedidos');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'variables.env' });


const crearToken = (usuario, secreta, expiresIn) => {
    console.log(usuario);
    const { id, email, nombre, apellido } = usuario;

    return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn });
}

//Resolvers
const resolvers = {
    Query: {
        obtenerUsuario: async (_, { }, ctx) => {
            return ctx.usuario;
        },

        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({})
                return productos;

            } catch (error) {
                console.log(error)
            }
        },
        obtenerProducto: async (_, { id }) => {
            //Revisar sei existe el Producto
            const producto = await Producto.findById(id);

            if (!producto) {
                throw new Error('El Producto No Existe')
            }
            return producto;
        },
        obtenerClientes: async () => {
            try {
                const clientes = Cliente.find({});
                return clientes;
            } catch (error) {
                console.log(error)
            }
        },
        obtenerClientesVendedor: async (_, { }, ctx) => {
            try {
                const clientes = Cliente.find({ vendedor: ctx.usuario.id.toString() });
                return clientes;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerCliente: async (_, { id }, ctx) => {
            //Revisar si existe el cliente
            const cliente = await Cliente.findById(id);
            if (!cliente) {
                throw new Error('El Cliente No Existe');
            }
            //Solo puéde verlo quien lo creo
            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes acceso a este cliente');
            }
            return cliente;
        },
        obtenerPedidos: async () => {
            try {
                const pedidos = Pedidos.find({});
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerPedidosVendedor: async (_, { }, ctx) => {
            try {
                const pedidos = await Pedidos.find({ vendedor: ctx.usuario.id }).populate('cliente');
                console.log(pedidos);
                return pedidos;
            } catch (error) {
                console.log(error)
            }
        },
        obtenerPedido: async (_, { id }, ctx) => {
            //Verificar que existe el pedido
            const pedido = await Pedidos.findById(id);
            if (!pedido) {
                throw new Error('No existe el pedido');
            }
            //Si existe el pedido, solo lo puede ver quien lo creo
            if (pedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes acceso a este pedido');
            }

            //Retornar el resultado
            return pedido;
        },
        obtenerPedidosEstado: async (_, { estado }, ctx) => {
            const pedidos = await Pedidos.find({ vendedor: ctx.usuario.id, estado });
            return pedidos;
        },
        mejoresClientes: async () => {
            const clientes = await Pedidos.aggregate([
                //lAS INSTRUCCIONES CON SIGNO DE DOLAR $ DELANTE SON INSTRUCCIONES DE MOONGDB
                { $match: { estado: "COMPLETADO" } },
                {
                    $group: {
                        _id: "$cliente",
                        total: { $sum: '$total' }
                    }
                },
                {
                    $lookup: {
                        from: 'clientes',
                        localField: '_id',
                        foreignField: "_id",
                        as: "cliente"
                    }
                },
                {
                    $limit: 10
                },
                {
                    $sort: {total: - 1}
                }
            ]);
            return clientes
        },
        mejoresVendedores: async () => {
            const vendedores = await Pedidos.aggregate([
                { $match: { estado: "COMPLETADO" } },
                {
                    $group: {
                        _id: "$vendedor",
                        total: { $sum: '$total' }
                    }
                },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: '_id',
                        foreignField: "_id",
                        as: "vendedor"
                    }
                },
                {
                    $limit: 3
                },
                {
                    $sort: {total: - 1}
                }

            ]);
            return vendedores;
        },
        buscarProducto: async (_, {texto}) => {
            const productos = await Producto.find({$text: { $search: texto} }).limit(10);
            return productos;
        }
    },

    //Mutations
    Mutation: {
        nuevoUsuario: async (_, { input }) => {
            const { email, password } = input;

            //Revisar si el usuario ya esta registrado
            const existeUsuario = await Usuario.findOne({ email });
            if (existeUsuario) {
                throw new Error('El Usuario Ya Existe')
            }
            //Hashear el password
            const salt = await bcrypt.genSalt(10);
            input.password = await bcrypt.hash(password, salt);

            //Guardar en La BD
            try {
                const usuario = new Usuario(input);
                usuario.save();//Guardar en la bd
                return usuario;
            } catch (error) {
                console.log(error)
            }
        },

        autenticarUsuario: async (_, { input }) => {
            const { email, password } = input;

            //Sie el Usuario existe
            const existeUsuario = await Usuario.findOne({ email });
            if (!existeUsuario) {
                throw new Error('El Usuario No Existe')
            }

            //Revisar que el password sea correcto
            const passwordCorrecto = await bcrypt.compare(password, existeUsuario.password);
            if (!passwordCorrecto) {
                throw new Error('El Password No Es Correcto')

            }
            //crear el Token
            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '24h')
            }
        },

        nuevoProducto: async (_, { input }) => {
            try {
                const producto = new Producto(input);

                //Almacenar en la BD
                const resultado = await producto.save();

                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarProducto: async (_, { id, input }) => {
            //Revisar sei existe el Producto
            let producto = await Producto.findById(id);

            if (!producto) {
                throw new Error('El Producto No Existe')
            }
            //Guardar en la bd
            producto = await Producto.findOneAndUpdate({ _id: id }, input, { new: true });
            return producto;
        },
        eliminarProducto: async (_, { id }) => {
            //Revisar sei existe el Producto
            let producto = await Producto.findById(id);
            if (!producto) {
                throw new Error('El Producto No Existe')
            }
            //Eliminar
            await Producto.findOneAndDelete({ _id: id });

            return "Producto Eliminado";
        },
        nuevoCliente: async (_, { input }, ctx) => {

            // console.log(ctx);

            const { email } = input;
            //Verificar si el cliente ya esta registrado
            // console.log(input)

            const cliente = await Cliente.findOne({ email })
            if (cliente) {
                throw new Error('El Cliente ya esta registrado');
            }

            const nuevoCliente = new Cliente(input);

            //Asignar vendedor
            nuevoCliente.vendedor = ctx.usuario.id;

            //almacenar en la BD
            try {
                const resultado = await nuevoCliente.save();
                return resultado;
            } catch (error) {
                console.log(error)
            }
        },
        actualizarCliente: async (_, { id, input }, ctx) => {
            //Verificar si existe el cliente
            let cliente = await Cliente.findById(id);
            if (!cliente) {
                throw new Error('El Cliente no Existe');
            }

            //Verificar si qie lo quiere editar es quien lo creo
            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes acceso a este cliente');
            }

            //Guardar El cliente actualizado
            cliente = await Cliente.findOneAndUpdate({ _id: id }, input, { new: true });
            return cliente;
        },
        eliminarCliente: async (_, { id, input }, ctx) => {
            //Verificar si existe el cliente
            let cliente = await Cliente.findById(id);
            if (!cliente) {
                throw new Error('El Cliente no Existe');
            }
            //Verificar si qie lo quiere eliminar es quien lo creo
            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes acceso a este cliente');
            }

            //Eliminar el cliente
            await Cliente.findOneAndDelete({ _id: id });
            return "Cliente Eliminado";
        },
        nuevoPedido: async (_, { input }, ctx) => {
            const { cliente } = input;
            //Verificar si existe el cliente
            let clienteExiste = await Cliente.findById(cliente);
            if (!clienteExiste) {
                throw new Error('El Cliente no Existe');
            }
            //Verificar que el cliente sea del vendedor 
            if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes acceso a este cliente');
            }
            //Revisar que haya existencias en el stock
            for await (const articulo of input.pedido) {
                const { id } = articulo;
                const producto = await Producto.findById(id)
                // console.log(producto)
                if (articulo.cantidad > producto.existencia) {
                    throw new Error(`El pedido de: ${producto.nombre} excede la cantidad disponible `);
                } else {
                    //Restar el pedido a las existencias
                    producto.existencia = producto.existencia - articulo.cantidad;

                    await producto.save();
                }
            }
            //Crear un nuevo Pedido
            const nuevoPedido = new Pedidos(input);

            //Asignar un Vendedor
            nuevoPedido.vendedor = ctx.usuario.id;

            //Guardar en la BD
            const resultado = await nuevoPedido.save();
            return resultado;
        },
        actualizarPedido: async (_, { id, input }, ctx) => {

            //Verificar que existe el pedido
            const existePedido = await Pedidos.findById(id);
            if (!existePedido) {
                throw new Error('El pedido no existe');
            }

            const { cliente } = input;
            //Verificar si existe el cliente
            let clienteExiste = await Cliente.findById(cliente);
            if (!clienteExiste) {
                throw Error('El Cliente no Existe');
            }

            //Verificar si qien lo quiere editar es quien lo creo
            if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes acceso a este pedido');
            }

            //Revisar que haya existencias en el stock
            if (input.pedido) {
                for await (const articulo of input.pedido) {
                    const { id } = articulo;
                    const producto = await Producto.findById(id)
                    // console.log(producto)
                    if (articulo.cantidad > producto.existencia) {
                        throw new Error(`El pedido de: ${producto.nombre} excede la cantidad disponible `);
                    } else {
                        //Restar el pedido a las existencias
                        producto.existencia = producto.existencia - articulo.cantidad;

                        await producto.save();
                    }
                }
            }
            //Guardar el pedido
            const resultado = await Pedidos.findOneAndUpdate({ _id: id }, input, { new: true });
            return resultado;
        },
        eliminarPedido: async (_, { id }, ctx) => {
            //Revisar sei existe el Producto
            let pedido = await Pedidos.findById(id);
            if (!pedido) {
                throw new Error('El pedido No Existe')
            }
            //Verificar si qie lo quiere eliminar es quien lo creo
            if (pedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes acceso a este pedido');
            }

            //Eliminar
            await Pedidos.findOneAndDelete({ _id: id });

            return "Pedido Eliminado";
        },
    }
}
module.exports = resolvers;
