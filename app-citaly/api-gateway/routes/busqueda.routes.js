const express = require('express');
const router = express.Router();
const busquedaController = require('../controllers/busqueda.controller');
const { validateRequired } = require('../middlewares/auth');

/**
 * Rutas para b�squedas y utilidades
 */

// GET /api/search - B�squeda global
router.get('/search',
  busquedaController.globalSearch
);

// GET /api/countries - Lista de pa�ses
router.get('/countries', busquedaController.getCountries);

// GET /api/states/:countryCode - Estados por pa�s
router.get('/states/:countryCode', busquedaController.getStates);

// POST /api/logout - Cerrar sesi�n
router.post('/logout', busquedaController.logout);

module.exports = router;
