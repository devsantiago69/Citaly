const express = require('express');
const router = express.Router();
const staffSpecialtyController = require('../controllers/staffSpecialty.controller');
const { validateRequired } = require('../middlewares/auth');

/**
 * Rutas para especialidades del personal
 */

// GET /api/staff/:staffId/specialties - Obtener especialidades de un staff
router.get('/:staffId/specialties',
  staffSpecialtyController.getStaffSpecialties
);

// POST /api/staff/:staffId/specialties - Asignar especialidad a staff
router.post('/:staffId/specialties',
  validateRequired(['specialty_id']),
  staffSpecialtyController.assignSpecialtyToStaff
);

// PUT /api/staff/:staffId/specialties/:assignmentId - Actualizar asignación
router.put('/:staffId/specialties/:assignmentId',
  staffSpecialtyController.updateStaffSpecialty
);

// DELETE /api/staff/:staffId/specialties/:assignmentId - Eliminar asignación
router.delete('/:staffId/specialties/:assignmentId',
  staffSpecialtyController.removeStaffSpecialty
);

module.exports = router;
