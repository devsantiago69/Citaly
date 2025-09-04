const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, getEspecialidades } = require('../controllers/categorias.controller.js');
const { verifyToken } = require('../middlewares/auth');

// Todas las rutas protegidas por token
router.get('/', verifyToken, getAll);
router.get('/:id', verifyToken, getById);
router.post('/', verifyToken, create);
router.put('/:id', verifyToken, update);
router.delete('/:id', verifyToken, remove);

// Especialidades/servicios de una categoría
router.get('/:id/especialidades', verifyToken, getEspecialidades);
router.get('/:id/servicios', verifyToken, getEspecialidades); // Alias para mayor claridad

module.exports = router;
