const db = require('../config/db');
const logger = require('../logger');

// Endpoint: GET /api/appointments/stats
exports.getStats = async (req, res) => {
  try {
    const { company_id = 1, start_date, end_date } = req.query;
    // logger.info('[APPOINTMENTS] getStats - Params:', { company_id, start_date, end_date });
    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = `AND fecha BETWEEN '${start_date}' AND '${end_date}'`;
    } else {
      dateFilter = 'AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }
    // Query para obtener stats diarios usando el precio del servicio
    const statsQuery = `
      SELECT
        DATE(citas.fecha) as date,
        COUNT(*) as total_appointments,
        SUM(CASE WHEN citas.estado = 'completada' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN citas.estado = 'pendiente' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN citas.estado = 'cancelada' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN citas.estado = 'completada' THEN servicios.precio ELSE 0 END) as total_revenue
      FROM citas
      LEFT JOIN servicios ON citas.servicio_id = servicios.id
      WHERE citas.empresa_id = ? ${dateFilter}
      GROUP BY DATE(citas.fecha)
      ORDER BY DATE(citas.fecha) ASC
    `;
    // logger.info('[APPOINTMENTS] getStats - Query:', { statsQuery });
    const [results] = await db.execute(statsQuery, [company_id]);
    // logger.info('[APPOINTMENTS] getStats - Result:', results);
    res.json(results);
  } catch (error) {
    // logger.error('[APPOINTMENTS] getStats - Error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de citas', details: error.message });
  }
};
