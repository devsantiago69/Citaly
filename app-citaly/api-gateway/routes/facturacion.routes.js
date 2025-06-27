const express = require('express');
const router = express.Router();
const facturacionController = require('../controllers/facturacion.controller');
const { verifyToken } = require('../middlewares/auth');

// Rutas para planes
router.get('/planes', facturacionController.getPlanes);
router.get('/planes/:id', facturacionController.getPlan);

// Rutas para suscripciones
router.get('/suscripciones', verifyToken, facturacionController.getSuscripciones);
router.post('/suscripciones', verifyToken, facturacionController.createSuscripcion);
router.put('/suscripciones/:id', verifyToken, facturacionController.updateSuscripcion);

// Rutas para facturas
router.get('/facturas', verifyToken, facturacionController.getFacturas);
router.get('/facturas/estadisticas', verifyToken, facturacionController.getEstadisticasFacturacion);
router.post('/facturas', verifyToken, facturacionController.createFactura);
router.put('/facturas/:id/pagar', verifyToken, facturacionController.marcarFacturaPagada);

module.exports = router;
