const express = require("express");
const bodyParser = require('body-parser');
const { mp, success } = require("../controllers/paymentController");
const { authenticateJWT } = require('../middlewares/authJWT');
const router = express.Router();

router.get('/create-payment-link', authenticateJWT, mp); // Cambiado a /create-payment-link
router.get('/success', success);
router.get('/failure', success)
router.get('/payment')
// router.get('/webhook', webhook);


module.exports = router;