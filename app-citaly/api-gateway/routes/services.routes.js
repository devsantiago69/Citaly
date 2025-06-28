const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');

// Esta ruta debe ser '/' porque ya está montada en '/api/services'
router.get('/', servicesController.getAllServices);

module.exports = router;
