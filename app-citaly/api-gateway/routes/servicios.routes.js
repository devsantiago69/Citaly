
const express = require('express');
const router = express.Router();
const serviciosController = require('../controllers/servicios.controller');
const { validateRequired, verifyToken } = require('../middlewares/auth');

// GET todas las categorías de servicios
router.get('/categories', async (req, res) => {
  try {
    const empresa_id = req.companyId || req.params.empresa_id || req.query.empresa_id;
    if (!empresa_id) {
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }
    const db = require('../config/db');
    const [categorias] = await db.execute(`
      SELECT id, nombre AS name, descripcion AS description
      FROM categorias_servicio
      WHERE empresa_id = ?
      ORDER BY nombre ASC
    `, [empresa_id]);
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías', details: error.message });
  }
});

// Aplicar middleware de validaci�n de company en todas las rutas
router.use(verifyToken);

// GET todos los servicios
router.get('/', serviciosController.getServicios);

// POST crear nuevo servicio
router.post('/',
  validateRequired(['name', 'price', 'duration']),
  serviciosController.createServicio
);

// PUT actualizar servicio
router.put('/:id',
  validateRequired(['name', 'price', 'duration']),
  serviciosController.updateServicio
);

// DELETE eliminar servicio
router.delete('/:id', serviciosController.deleteServicio);

module.exports = router;
