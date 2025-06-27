const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// Rutas para clientes
router.get('/', clientesController.getClientes);
router.get('/search', clientesController.searchClientes);
router.get('/estadisticas', clientesController.getEstadisticasClientes);
router.get('/:id', clientesController.getCliente);
router.post('/', clientesController.createCliente);
router.put('/:id', clientesController.updateCliente);
router.delete('/:id', clientesController.deleteCliente);

module.exports = router;
