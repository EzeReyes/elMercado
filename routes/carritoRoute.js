const express = require("express");
const bodyParser = require('body-parser');
const { authenticateJWT } = require('../middlewares/authJWT');
const { mostrarCarrito, eliminarProducto, mp } = require("../controllers/carritoController");

const router = express.Router();

router.get('/carrito', authenticateJWT, mostrarCarrito);
router.post('/carrito', authenticateJWT, eliminarProducto);

module.exports = router;
