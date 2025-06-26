const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');

// Rutas para clientes
router.get('/empresa/:empresa_id', clientesController.getClientes);
router.get('/empresa/:empresa_id/search', clientesController.searchClientes);
router.get('/empresa/:empresa_id/estadisticas', clientesController.getEstadisticasClientes);
router.get('/:id', clientesController.getCliente);
router.post('/', clientesController.createCliente);
router.put('/:id', clientesController.updateCliente);
router.delete('/:id', clientesController.deleteCliente);

module.exports = router;
