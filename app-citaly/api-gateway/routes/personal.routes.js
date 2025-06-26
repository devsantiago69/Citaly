const express = require('express');
const router = express.Router();
const personalController = require('../controllers/personal.controller');

// Rutas para personal
router.get('/empresa/:empresa_id', personalController.getPersonal);
router.get('/empresa/:empresa_id/estadisticas', personalController.getEstadisticasPersonal);
router.get('/empresa/:empresa_id/servicio/:servicio_id/disponible', personalController.getPersonalDisponible);
router.get('/:id', personalController.getPersonalById);
router.post('/', personalController.createPersonal);
router.put('/:id', personalController.updatePersonal);

// Especialidades
router.post('/:personal_id/especialidades', personalController.asignarEspecialidad);
router.delete('/:personal_id/especialidades/:especialidad_id', personalController.removerEspecialidad);

// Servicios
router.post('/:personal_id/servicios', personalController.asignarServicio);
router.delete('/:personal_id/servicios/:servicio_id', personalController.removerServicio);

// Horarios
router.put('/:personal_id/horarios', personalController.updateHorario);

module.exports = router;
