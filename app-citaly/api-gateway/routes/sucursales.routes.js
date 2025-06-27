const express = require('express');
const router = express.Router();
const sucursalesController = require('../controllers/sucursales.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// Rutas para sucursales (nueva estructura)

// GET /api/sucursales - Obtener todas las sucursales con paginación
router.get('/', sucursalesController.getAllSucursales);

// GET /api/sucursales/:id - Obtener sucursal por ID con cajas y personal
router.get('/:id', sucursalesController.getSucursalById);

// POST /api/sucursales - Crear nueva sucursal con cajas y personal
router.post('/', sucursalesController.createSucursal);

// PUT /api/sucursales/:id - Actualizar sucursal
router.put('/:id', sucursalesController.updateSucursal);

// DELETE /api/sucursales/:id - Eliminar sucursal (soft delete)
router.delete('/:id', sucursalesController.deleteSucursal);

// POST /api/sucursales/:sucursalId/cajas - Agregar caja a sucursal
router.post('/:sucursalId/cajas', sucursalesController.addCaja);

// GET /api/sucursales/:id/estadisticas - Obtener estadísticas de sucursal
router.get('/:id/estadisticas', sucursalesController.getEstadisticas);

module.exports = router;
