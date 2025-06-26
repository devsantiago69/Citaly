const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { validateRequired, validateEmail, validateCompany } = require('../middlewares/auth');

// Aplicar middleware de validación de company en todas las rutas
router.use(validateCompany);

// ===== CLIENTES =====
// GET todos los clientes
router.get('/clients', usuariosController.getClientes);

// POST crear nuevo cliente
router.post('/clients',
  validateRequired(['first_name', 'last_name', 'document_number', 'email', 'phone']),
  validateEmail,
  usuariosController.createCliente
);

// PUT actualizar cliente
router.put('/clients/:id',
  validateRequired(['first_name', 'last_name', 'document_number', 'email', 'phone']),
  validateEmail,
  usuariosController.updateCliente
);

// DELETE eliminar cliente
router.delete('/clients/:id', usuariosController.deleteCliente);

// ===== STAFF =====
// GET todo el staff
router.get('/staff', usuariosController.getStaff);

// POST crear nuevo staff
router.post('/staff',
  validateRequired(['name', 'email', 'role']),
  validateEmail,
  usuariosController.createStaff
);

// ===== ADMINISTRADORES =====
// GET todos los administradores
router.get('/admins', usuariosController.getAdmins);

module.exports = router;
