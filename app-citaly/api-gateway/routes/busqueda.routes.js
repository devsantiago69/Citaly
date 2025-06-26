const express = require('express');
const router = express.Router();
const busquedaController = require('../controllers/busqueda.controller');
const { validateRequired } = require('../middlewares/auth');

/**
 * Rutas para búsquedas y utilidades
 */

// GET /api/search - Búsqueda global
router.get('/search',
  busquedaController.globalSearch
);

// GET /api/countries - Lista de países
router.get('/countries', busquedaController.getCountries);

// GET /api/states/:countryCode - Estados por país
router.get('/states/:countryCode', busquedaController.getStates);

// POST /api/logout - Cerrar sesión
router.post('/logout', busquedaController.logout);

module.exports = router;
