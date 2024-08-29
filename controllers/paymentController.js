const db = require('../db/db');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const { MercadoPagoConfig, Preference} = require('mercadopago');
// Initialize the client object
const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN, options: { timeout: 5000 } });

// Initialize the API object
const preference = new Preference(client);

const mp = async (req, res) => {
    const csrfToken = req.csrfToken();
    const Cliente_ID = req.session.Cliente_ID;

    const sqlCarrito = 'SELECT p.Producto_ID, p.Nombre, p.Descripcion, p.Precio, p.Foto_Url, c.Cantidad FROM carrito c JOIN productos p ON c.Producto_ID = p.Producto_ID WHERE c.Cliente_ID = ?';

    db.query(sqlCarrito, [Cliente_ID], async (err, resultsCarrito) => {
        if (err) {
            console.error('Error en la consulta:', err);
            return res.status(500).send('Error en la consulta de la base de datos');
        }

        const items = resultsCarrito.map(producto => ({
            id: producto.Producto_ID.toString(),
            category_id: producto.Producto_ID.toString(),
            title: producto.Nombre,
            description: producto.Descripcion,
            picture_url: producto.Foto_Url,
            quantity: producto.Cantidad,
            unit_price: producto.Precio,
            currency_id: 'ARS'
        }));

        // Calcular el total del pedido
        const totalAmount = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);

        // Insertar un nuevo pedido en la tabla orders
        const sqlInsertOrder = 'INSERT INTO orders (Cliente_ID, Total_Amount) VALUES (?, ?)';
        db.query(sqlInsertOrder, [Cliente_ID, totalAmount], async (err, result) => {
            if (err) {
                console.error('Error insertando el pedido:', err);
                return res.status(500).send('Error insertando el pedido en la base de datos');
            }

            const orderID = result.insertId;

            // Insertar los productos del carrito en la tabla order_items
            const sqlInsertOrderItem = 'INSERT INTO order_items (Order_ID, Producto_ID, Cantidad, Precio) VALUES ?';
            const orderItems = resultsCarrito.map(producto => [orderID, producto.Producto_ID, producto.Cantidad, producto.Precio]);

            db.query(sqlInsertOrderItem, [orderItems], async (err) => {
                if (err) {
                    console.error('Error insertando los items del pedido:', err);
                    return res.status(500).send('Error insertando los items del pedido en la base de datos');
                }

                const urls = {
                    failure: `http://localhost:3000/failure?order_id=${orderID}`,
                    pending: `http://localhost:3000/pending?order_id=${orderID}`,
                    success: `http://localhost:3000/success?order_id=${orderID}`
                };

                        try {
                    const paymentRequest = await preference.create({
                        body: {
                            items,
                            back_urls: urls,
                            auto_return: 'approved',
                            external_reference: orderID.toString()
                        }
                    });
                    console.log('Payment link created:', paymentRequest);
                    res.redirect(paymentRequest.sandbox_init_point);
                } catch (error) {
                    console.error('Error creando el enlace de pago:', error);
                    res.status(500).send('Error creando el enlace de pago');
                }
            });
        });
    });
};

const success = (req, res) => {
    const { order_id, status, payment_type } = req.query;
	const Cliente_ID = req.session.Cliente_ID;

    // Aquí puedes procesar la información y actualizar tu base de datos
    console.log('Payment result:', req.query);
	const sqlUpdateStatus = 'UPDATE orders SET status = ?, payment_type = ? WHERE order_ID = ?'
	db.query(sqlUpdateStatus, [ status, payment_type, order_id ], async (err) => {
		if (err) {
			console.error('Error insertando los items del pedido:', err);
			return res.render('payment/failure');
		}

		// / Mover la orden a la tabla de historial de compras
        const sqlMoveToHistory = 
		`INSERT INTO historial_compras (Cliente_ID, order_ID, Producto_ID, Cantidad, Precio)
        SELECT ?, order_ID, Producto_ID, Cantidad, Precio FROM order_items
        WHERE order_ID = ?`;
        db.query(sqlMoveToHistory, [ Cliente_ID, order_id], (err) => {
            if (err) {
                console.error('Error moviendo la orden al historial de compras:', err);
                return res.status(500).send('Error moviendo la orden al historial de compras en la base de datos');
            }

            // Archivar la orden: marcar los productos en el carrito como comprados
            const sqlArchiveCart = 'DELETE FROM carrito WHERE Cliente_ID = ?';
            db.query(sqlArchiveCart, [Cliente_ID], (err) => {
                if (err) {
                    console.error('Error archivando el carrito:', err);
                    return res.status(500).send('Error archivando el carrito en la base de datos');
                }
		res.render('payment/success');
			})
		})
	})
}



module.exports = {
				mp,
				success
			};