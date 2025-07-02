const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');

// Rutas de facturación
router.get('/facturas', billingController.getFacturas);
router.post('/facturas', billingController.createFactura);
router.get('/facturas/:id', billingController.getFacturaById);
router.delete('/facturas/:id', billingController.deleteFactura);

module.exports = router;
