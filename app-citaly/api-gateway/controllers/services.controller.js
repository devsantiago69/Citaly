const db = require('../config/db');
const logger = require('../logger');

// Obtener todos los servicios reales
exports.getAllServices = async (req, res) => {
  try {
    logger.info('[SERVICES] GET /api/services - Request', {
      headers: req.headers,
      ip: req.ip,
      query: req.query,
      origin: req.get('origin')
    });
    const [rows] = await db.execute(`
      SELECT s.id, s.nombre AS name, cs.nombre AS category, s.duracion AS duration, s.precio AS price
      FROM servicios s
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      WHERE s.estado = 0
      ORDER BY s.nombre ASC
    `);
    logger.info('[SERVICES] GET /api/services - Response', { count: rows.length, data: rows });
    res.json(rows);
  } catch (error) {
    logger.error('[SERVICES] GET /api/services - Error', { error: error.message });
    res.status(500).json({ error: 'Error al obtener servicios', details: error.message });
  }
};
