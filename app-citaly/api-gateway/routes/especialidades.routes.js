const express = require('express');
const router = express.Router();
const especialidadesController = require('../controllers/especialidades.controller');
const { validateRequired, validateCompany } = require('../middlewares/auth');

// Aplicar middleware de validación de company en todas las rutas
router.use(validateCompany);

// ===== ESPECIALIDADES =====
// GET todas las especialidades
router.get('/', especialidadesController.getEspecialidades);

// POST crear nueva especialidad
router.post('/',
  validateRequired(['name']),
  especialidadesController.createEspecialidad
);

// PUT actualizar especialidad
router.put('/:id',
  validateRequired(['name']),
  especialidadesController.updateEspecialidad
);

// DELETE eliminar especialidad
router.delete('/:id', especialidadesController.deleteEspecialidad);

// ===== ESPECIALIDADES DE STAFF =====
// GET especialidades de un staff
router.get('/staff/:staffId', especialidadesController.getStaffEspecialidades);

// POST asignar especialidad a staff
router.post('/staff/:staffId',
  validateRequired(['specialtyId']),
  especialidadesController.assignEspecialidadToStaff
);

// PUT actualizar asignación de especialidad
router.put('/staff/:staffId/:assignmentId',
  especialidadesController.updateStaffEspecialidad
);

// DELETE eliminar asignación de especialidad
router.delete('/staff/:staffId/:assignmentId',
  especialidadesController.deleteStaffEspecialidad
);

module.exports = router;
