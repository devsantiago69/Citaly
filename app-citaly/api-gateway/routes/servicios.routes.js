const express = require('express');
const router = express.Router();
const serviciosController = require('../controllers/servicios.controller');
const { validateRequired, verifyToken } = require('../middlewares/auth');

// Aplicar middleware de validación de company en todas las rutas
router.use(verifyToken);

// GET todos los servicios
router.get('/', serviciosController.getServicios);

// POST crear nuevo servicio
router.post('/',
  validateRequired(['name', 'price', 'duration']),
  serviciosController.createServicio
);

// PUT actualizar servicio
router.put('/:id',
  validateRequired(['name', 'price', 'duration']),
  serviciosController.updateServicio
);

// DELETE eliminar servicio
router.delete('/:id', serviciosController.deleteServicio);

module.exports = router;
