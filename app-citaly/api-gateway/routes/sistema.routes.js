const express = require('express');
const router = express.Router();
const sistemaController = require('../controllers/sistema.controller');
const soporteController = require('../controllers/soporte.controller');
const { validateRequired, verifyToken } = require('../middlewares/auth');

// ===== RUTAS DE SISTEMA =====

// B�squeda global
router.get('/search', verifyToken, sistemaController.globalSearch);

// Pa�ses y estados
router.get('/countries', sistemaController.getCountries);
router.get('/states/:countryCode', sistemaController.getStates);

// Health check
router.get('/health', sistemaController.healthCheck);

// Logout
router.post('/logout', sistemaController.logout);

// ===== RUTAS DE SOPORTE =====
// Aplicar middleware de validaci�n de company para soporte
router.use('/support-cases', verifyToken);

// GET todos los casos de soporte
router.get('/support-cases', soporteController.getSupportCases);

// POST crear nuevo caso de soporte
router.post('/support-cases',
  validateRequired(['subject', 'description']),
  soporteController.createSupportCase
);

// PUT actualizar caso de soporte
router.put('/support-cases/:id',
  soporteController.updateSupportCase
);

// DELETE eliminar caso de soporte
router.delete('/support-cases/:id',
  soporteController.deleteSupportCase
);

// GET estad�sticas de soporte
router.get('/support-cases/stats',
  soporteController.getSupportStats
);

module.exports = router;
