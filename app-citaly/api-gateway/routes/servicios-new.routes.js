const express = require('express');
const router = express.Router();
const serviciosController = require('../controllers/servicios-new.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// Rutas para servicios
router.get('/', serviciosController.getServicios);
router.get('/estadisticas', serviciosController.getEstadisticasServicios);
router.get('/:id', serviciosController.getServicio);
router.post('/', serviciosController.createServicio);
router.put('/:id', serviciosController.updateServicio);
router.delete('/:id', serviciosController.deleteServicio);

// Servicios por sucursal
router.post('/sucursal', serviciosController.asignarServicioASucursal);
router.put('/:servicio_id/sucursal/:sucursal_id/precio', serviciosController.actualizarPrecioEnSucursal);

// Categorías
router.get('/categorias', serviciosController.getCategorias);
router.post('/categorias', serviciosController.createCategoria);

module.exports = router;
