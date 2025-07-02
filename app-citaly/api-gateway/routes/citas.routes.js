
const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citas.controller');
const { validateRequired, verifyToken } = require('../middlewares/auth');
// GET todas las citas para DataTable (detallado)
router.get('/datatable', verifyToken, citasController.getCitasDataTable);

// Aplicar middleware de validaci�n de company en todas las rutas
router.use(verifyToken);

// GET estadísticas de citas
router.get('/stats', citasController.getEstadisticasCitas);

// GET todas las citas
router.get('/', citasController.getCitas);

// GET lista de citas (formato simplificado)
router.get('/list', (req, res) => {
  res.json([]); // Respuesta vac�a temporal para evitar error de callback undefined
});

// GET eventos de calendario
router.get('/calendar', citasController.getAppointmentsCalendar);

// GET filtros para citas
router.get('/filters', citasController.getAppointmentsFilters);

// POST crear nueva cita
router.post('/',
  validateRequired(['client_id', 'service_id', 'date', 'time']),
  citasController.createCita
);

// PUT actualizar cita
router.put('/:id',
  validateRequired(['status']),
  citasController.updateCita
);

// DELETE eliminar cita
router.delete('/:id', citasController.deleteCita);

// GET citas para el calendario mensual (nuevo endpoint real)
router.get('/calendar/month', citasController.getCitasCalendar);

// --- NUEVAS RUTAS DE ACCIONES DE CITA ---
router.post('/:id/cancelar', citasController.cancelarCita);
router.post('/:id/reagendar', citasController.reagendarCita);
router.post('/:id/asignar-sucursal', citasController.asignarSucursalCita);
router.post('/:id/pagar', citasController.pagarCita);

module.exports = router;
