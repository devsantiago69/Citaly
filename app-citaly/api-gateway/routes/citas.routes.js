const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citas.controller');
const { validateRequired, validateCompany } = require('../middlewares/auth');

// Aplicar middleware de validación de company en todas las rutas
router.use(validateCompany);

// GET todas las citas
router.get('/', citasController.getCitas);

// GET lista de citas (formato simplificado)
router.get('/list', citasController.getAppointmentsList);

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

module.exports = router;
