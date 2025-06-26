const express = require('express');
const router = express.Router();
const facturacionController = require('../controllers/facturacion.controller');

// Rutas para planes
router.get('/planes', facturacionController.getPlanes);
router.get('/planes/:id', facturacionController.getPlan);

// Rutas para suscripciones
router.get('/suscripciones/empresa/:empresa_id', facturacionController.getSuscripciones);
router.post('/suscripciones', facturacionController.createSuscripcion);
router.put('/suscripciones/:id', facturacionController.updateSuscripcion);

// Rutas para facturas
router.get('/facturas/empresa/:empresa_id', facturacionController.getFacturas);
router.get('/facturas/empresa/:empresa_id/estadisticas', facturacionController.getEstadisticasFacturacion);
router.post('/facturas', facturacionController.createFactura);
router.put('/facturas/:id/pagar', facturacionController.marcarFacturaPagada);

module.exports = router;
