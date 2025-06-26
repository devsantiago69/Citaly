const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagos.controller');

// Rutas para gestión de pagos
router.get('/', pagosController.getPagos);
router.get('/estadisticas', pagosController.getEstadisticasPagos);
router.get('/factura/:id', pagosController.getDetalleFactura);
router.post('/procesar', pagosController.procesarPago);
router.get('/reportes', pagosController.generarReporte);
router.get('/metodos-pago', pagosController.getMetodosPago);
router.post('/:id/anular', pagosController.anularPago);

module.exports = router;
