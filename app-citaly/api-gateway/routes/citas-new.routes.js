const express = require('express');
const router = express.Router();
const citasNewController = require('../controllers/citas-new.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// Rutas para citas (nueva estructura)

// GET /api/citas-new - Obtener todas las citas con filtros
router.get('/', citasNewController.getAllCitas);

// GET /api/citas-new/availability - Obtener disponibilidad de personal
router.get('/availability', citasNewController.getAvailability);

// GET /api/citas-new/:id - Obtener cita por ID
router.get('/:id', citasNewController.getCitaById);

// POST /api/citas-new - Crear nueva cita
router.post('/', citasNewController.createCita);

// PUT /api/citas-new/:id - Actualizar cita
router.put('/:id', citasNewController.updateCita);

// PUT /api/citas-new/:id/status - Cambiar estado de cita
router.put('/:id/status', citasNewController.changeStatus);

// DELETE /api/citas-new/:id - Eliminar cita
router.delete('/:id', citasNewController.deleteCita);

module.exports = router;
