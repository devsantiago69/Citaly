const db = require('../config/db');

// Obtener todos los servicios reales
exports.getAllServices = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.id, s.nombre AS name, cs.nombre AS category, s.duracion AS duration, s.precio AS price
      FROM servicios s
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      WHERE s.estado = 0
      ORDER BY s.nombre ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios', details: error.message });
  }
};
