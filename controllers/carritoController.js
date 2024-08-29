const db = require('../db/db');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

    // Página Carrito
const mostrarCarrito = (req, res) => {
    const csrfToken = req.csrfToken();
    const Cliente_ID = req.session.Cliente_ID 
    const sqlCarrito = 'SELECT p.Producto_ID, p.Nombre, p.Descripcion, p.Precio, p.Foto_Url, c.Cantidad FROM carrito c JOIN productos p ON c.Producto_ID = p.Producto_ID WHERE c.Cliente_ID = ?';
    const sqlTotal = 'SELECT SUM(p.Precio * c.Cantidad) AS total FROM carrito c JOIN productos p ON c.Producto_ID = p.Producto_ID WHERE c.Cliente_ID = ?';

    db.query(sqlCarrito, [Cliente_ID], (err, resultsCarrito) => {
        if (err) throw err;
        
        db.query(sqlTotal, [Cliente_ID], (err, resultsSuma) => {
            if (err) throw err;
            console.log(resultsCarrito)
            const total = resultsSuma[0].total || 0;  // Maneja el caso en el que el total es NULL
            res.render('pages/carrito', { resultsCarrito, total, csrfToken });


});
});
}


// eliminar Producto por ID, desde el carrito
const eliminarProducto = (req, res) => {
    const { id } = req.body;
    const sqlGetQuantity = 'SELECT Cantidad FROM carrito WHERE Producto_ID = ?';
    const sqlDelete = 'DELETE from carrito WHERE Producto_ID = ?';
    const sqlUpdateStock = 'UPDATE productos SET Stock = Stock + ? WHERE Producto_ID = ?';

db.query(sqlGetQuantity, [id], (err, getResult) => {
    if (err) {
        console.error(err);
        return res.status(500).send('Ocurrio un error al obtener los datos');
    }

const quantity = getResult[0].Cantidad;
// console.log(`La cantidad es: ${quantity}`);

db.query(sqlUpdateStock, [quantity, id], (err,upDateResult) => {
    if (err) {
        console.error(err);
        return res.status(500).send('Ocurrió un error al actualizar el stock del producto');
    }

db.query(sqlDelete, [id], (err, deleteResult) => {

    if (err) {
        console.error(err);
        return res.status(500).send('Ocurrió un error al eliminar el producto del carrito');
    }
    // Redirigir a la página del carrito después de la eliminación
                mostrarCarrito(req, res);
});
});
});
}


// const mp = async (req, res) => {
//     const csrfToken = req.csrfToken();
//     const Cliente_ID = req.session.Cliente_ID;

//     const sqlCarrito = 'SELECT p.Producto_ID, p.Nombre, p.Descripcion, p.Precio, p.Foto_Url, c.Cantidad FROM carrito c JOIN productos p ON c.Producto_ID = p.Producto_ID WHERE c.Cliente_ID = ?';

//     db.query(sqlCarrito, [Cliente_ID], async (err, resultsCarrito) => {
//         if (err) {
//             console.error('Error en la consulta:', err);
//             return res.status(500).send('Error en la consulta de la base de datos');
//         }

//         const items = resultsCarrito.map(producto => ({
//             id: producto.Producto_ID.toString(),
//             category_id: producto.Producto_ID.toString(),
//             title: producto.Nombre,
//             description: producto.Descripcion,
//             picture_url: producto.Foto_Url,
//             quantity: producto.Cantidad,
//             unit_price: producto.Precio,
//             currency_id: 'ARS'
//         }));

//         // Calcular el total del pedido
//         const totalAmount = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);

//         // Insertar un nuevo pedido en la tabla orders
//         const sqlInsertOrder = 'INSERT INTO orders (Cliente_ID, Total_Amount) VALUES (?, ?)';
//         db.query(sqlInsertOrder, [Cliente_ID, totalAmount], async (err, result) => {
//             if (err) {
//                 console.error('Error insertando el pedido:', err);
//                 return res.status(500).send('Error insertando el pedido en la base de datos');
//             }

//             const orderID = result.insertId;

//             // Insertar los productos del carrito en la tabla order_items
//             const sqlInsertOrderItem = 'INSERT INTO order_items (Order_ID, Producto_ID, Cantidad, Precio) VALUES ?';
//             const orderItems = resultsCarrito.map(producto => [orderID, producto.Producto_ID, producto.Cantidad, producto.Precio]);

//             db.query(sqlInsertOrderItem, [orderItems], async (err) => {
//                 if (err) {
//                     console.error('Error insertando los items del pedido:', err);
//                     return res.status(500).send('Error insertando los items del pedido en la base de datos');
//                 }

//                 const urls = {
//                     failure: `http://localhost:3000/failure?order_id=${orderID}`,
//                     pending: `http://localhost:3000/pending?order_id=${orderID}`,
//                     success: `http://localhost:3000/success?order_id=${orderID}`
//                 };

//                         try {
//                     const paymentRequest = await preference.create({
//                         body: {
//                             items,
//                             back_urls: urls,
//                             auto_return: 'approved',
//                             external_reference: orderID.toString()
//                         }
//                     });
//                     console.log('Payment link created:', paymentRequest);
//                     res.redirect(paymentRequest.sandbox_init_point);
//                 } catch (error) {
//                     console.error('Error creando el enlace de pago:', error);
//                     res.status(500).send('Error creando el enlace de pago');
//                 }
//             });
//         });
//     });
// };

// mercado pago

// const payment = (req, res) => {
//     console.log("Datos del pago recibidos:", req.body);
//     payment.create({
//         body: { 
//             transaction_amount: req.transaction_amount,
//             token: req.token,
//             description: req.description,
//             installments: req.installments,
//             payment_method_id: req.paymentMethodId,
//             issuer_id: req.issuer,
//                 payer: {
//                 email: req.email,
//                 identification: {
//             type: req.identificationType,
//             number: req.number
//         }}},
//         requestOptions: { idempotencyKey: '<SOME_UNIQUE_VALUE>' }
//     })
//     .then((result) => console.log(result))
//     .catch((error) => console.log(error));

// mercadopago.payment.save(payment_data)
// .then(response => {
//   console.log("Respuesta de Mercado Pago:", response.body);
//   res.status(201).json({
//     status: response.body.status,
//     status_detail: response.body.status_detail,
//     id: response.body.id
//   });
// })
// .catch(error => {
//   console.error('Error en la solicitud de pago:', error);
//   res.status(500).send(error);
// });
// };





module.exports = {
    mostrarCarrito,
    eliminarProducto
}