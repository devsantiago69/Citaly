const express = require('express');
const router = express.Router();
const userTypesController = require('../controllers/userTypes.controller');
const { validateRequired, validateCompany } = require('../middlewares/auth');

// Aplicar middleware de validación de company en todas las rutas
router.use(validateCompany);

// GET todos los tipos de usuario
router.get('/', userTypesController.getUserTypes);

// GET tipo de usuario por ID
router.get('/:id', userTypesController.getUserTypeById);

// POST crear nuevo tipo de usuario
router.post('/',
  validateRequired(['name', 'level']),
  userTypesController.createUserType
);

// PUT actualizar tipo de usuario
router.put('/:id',
  validateRequired(['name', 'level']),
  userTypesController.updateUserType
);

// DELETE eliminar tipo de usuario (soft delete)
router.delete('/:id', userTypesController.deleteUserType);

module.exports = router;
