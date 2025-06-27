const express = require('express');
const router = express.Router();
const cajasController = require('../controllers/cajas.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// Rutas para cajas
router.get('/sucursal/:sucursal_id', cajasController.getCajas);
router.get('/:id', cajasController.getCaja);
router.post('/', cajasController.createCaja);

// Sesiones de caja
router.post('/:caja_id/abrir', cajasController.abrirSesion);
router.post('/:caja_id/cerrar', cajasController.cerrarSesion);

// Movimientos de caja
router.post('/:caja_id/movimientos', cajasController.registrarMovimiento);
router.get('/sesiones/:sesion_id/movimientos', cajasController.getMovimientosSesion);

// Reportes
router.get('/:caja_id/reporte', cajasController.getReporteCaja);

module.exports = router;
