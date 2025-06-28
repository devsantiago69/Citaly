const db = require('../config/db');
const logger = require('../logger');
const { handleError } = require('../utils/helpers');

/**
 * Controlador para gesti�n de reportes y estad�sticas
 */
class ReportesController {
  /**
   * Obtener resumen general de la empresa
   */
  async getOverview(req, res) {
    try {
      const { company_id = 1 } = req.query;
      logger.info(`[REPORTES] getOverview - Params:`, { company_id });
      // Obtener estadísticas principales
      const overviewQuery = `
        SELECT
          (SELECT COUNT(*) FROM citas WHERE empresa_id = ? AND estado = 'Completada') as total_appointments,
          (SELECT COUNT(*) FROM citas WHERE empresa_id = ? AND DATE(fecha) = CURDATE()) as today_appointments,
          (SELECT COUNT(*) FROM usuarios WHERE empresa_id = ? AND tipo_usuario_id = 3 AND estado = 1) as total_clients,
          (SELECT COUNT(*) FROM usuarios WHERE empresa_id = ? AND tipo_usuario_id = 2 AND estado = 1) as total_staff,
          (SELECT SUM(precio) FROM citas c JOIN servicios s ON c.servicio_id = s.id WHERE c.empresa_id = ? AND c.estado = 'Completada' AND MONTH(c.fecha) = MONTH(CURDATE())) as monthly_revenue,
          (SELECT AVG(precio) FROM servicios WHERE empresa_id = ? AND estado = 0) as avg_service_price
      `;
      logger.info(`[REPORTES] getOverview - Query:`, { overviewQuery });
      const [overviewResults] = await db.execute(overviewQuery, [company_id, company_id, company_id, company_id, company_id, company_id]);
      logger.info(`[REPORTES] getOverview - Result:`, overviewResults);
      // Obtener citas recientes
      const recentAppointmentsQuery = `
        SELECT
          a.id,
          a.fecha as date,
          a.hora as time,
          a.estado as status,
          c.nombre as client_name,
          s.nombre as service_name,
          s.precio
        FROM citas a
        JOIN usuarios c ON a.cliente_id = c.id
        JOIN servicios s ON a.servicio_id = s.id
        WHERE a.empresa_id = ?
        ORDER BY a.fecha DESC, a.hora DESC
        LIMIT 5
      `;
      logger.info(`[REPORTES] getOverview - Recent Query:`, { recentAppointmentsQuery });
      const [recentAppointments] = await db.execute(recentAppointmentsQuery, [company_id]);
      logger.info(`[REPORTES] getOverview - Recent Result:`, recentAppointments);
      res.json({
        ...overviewResults[0],
        recent_appointments: recentAppointments
      });
    } catch (error) {
      logger.error('Error fetching overview:', error);
      handleError(res, error, 'Error al obtener resumen general');
    }
  }

  /**
   * Obtener reporte de ingresos
   */
  async getRevenue(req, res) {
    try {
      const { company_id = 1, start_date, end_date, period = 'month' } = req.query;
      logger.info(`[REPORTES] getRevenue - Params:`, { company_id, start_date, end_date, period });
      let dateFilter = '';
      let groupBy = '';

      if (period === 'month') {
        groupBy = 'YEAR(a.fecha), MONTH(a.fecha)';
        dateFilter = start_date && end_date ?
          `AND a.fecha BETWEEN '${start_date}' AND '${end_date}'` :
          'AND a.fecha >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)';
      } else if (period === 'week') {
        groupBy = 'YEAR(a.fecha), WEEK(a.fecha)';
        dateFilter = start_date && end_date ?
          `AND a.fecha BETWEEN '${start_date}' AND '${end_date}'` :
          'AND a.fecha >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)';
      } else {
        groupBy = 'DATE(a.fecha)';
        dateFilter = start_date && end_date ?
          `AND a.fecha BETWEEN '${start_date}' AND '${end_date}'` :
          'AND a.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      }

      const revenueQuery = `
        SELECT
          ${period === 'month' ? 'CONCAT(YEAR(a.fecha), "-", LPAD(MONTH(a.fecha), 2, "0"))' :
            period === 'week' ? 'CONCAT(YEAR(a.fecha), "-W", LPAD(WEEK(a.fecha), 2, "0"))' :
            'DATE(a.fecha)'} as period,
          SUM(s.precio) as revenue,
          COUNT(a.id) as appointments_count
        FROM citas a
        JOIN servicios s ON a.servicio_id = s.id
        WHERE a.empresa_id = ? AND a.estado = 'Completada' ${dateFilter}
        GROUP BY ${groupBy}
        ORDER BY period ASC
      `;
      logger.info(`[REPORTES] getRevenue - Query:`, { revenueQuery });
      const [results] = await db.execute(revenueQuery, [company_id]);
      logger.info(`[REPORTES] getRevenue - Result:`, results);
      res.json(results);
    } catch (error) {
      logger.error('Error fetching revenue report:', error);
      handleError(res, error, 'Error al obtener reporte de ingresos');
    }
  }

  /**
   * Obtener reporte de servicios
   */
  async getServices(req, res) {
    try {
      const { company_id = 1 } = req.query;
      logger.info(`[REPORTES] getServices - Params:`, { company_id });
      const servicesQuery = `
        SELECT
          s.id,
          s.nombre,
          s.precio,
          s.duracion,
          sc.nombre as categoria,
          COUNT(c.id) as appointments_count,
          SUM(CASE WHEN c.estado = 'Completada' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN c.estado = 'Completada' THEN s.precio ELSE 0 END) as revenue
        FROM servicios s
        LEFT JOIN categorias_servicio sc ON s.categoria_id = sc.id
        LEFT JOIN citas c ON s.id = c.servicio_id
        WHERE s.empresa_id = ? AND s.estado = 0
        GROUP BY s.id, s.nombre, s.precio, s.duracion, sc.nombre
        ORDER BY appointments_count DESC
      `;
      logger.info(`[REPORTES] getServices - Query:`, { servicesQuery });
      const [results] = await db.execute(servicesQuery, [company_id]);
      logger.info(`[REPORTES] getServices - Result:`, results);
      res.json(results);
    } catch (error) {
      logger.error('Error fetching services report:', error);
      handleError(res, error, 'Error al obtener reporte de servicios');
    }
  }

  /**
   * Obtener reporte de personal
   */
  async getStaff(req, res) {
    try {
      const { company_id = 1 } = req.query;
      logger.info(`[REPORTES] getStaff - Params:`, { company_id });
      const staffQuery = `
        SELECT
          u.id,
          u.nombre,
          u.email,
          u.telefono,
          COUNT(a.id) as appointments_count,
          SUM(CASE WHEN a.estado = 'Completada' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN a.estado = 'Completada' THEN s.precio ELSE 0 END) as revenue,
          ROUND(AVG(CASE WHEN a.estado = 'Completada' THEN s.precio END), 2) as avg_service_price
        FROM usuarios u
        LEFT JOIN citas a ON u.id = a.personal_id
        LEFT JOIN servicios s ON a.servicio_id = s.id
        WHERE u.empresa_id = ? AND u.tipo_usuario_id = 2 AND u.estado = 1
        GROUP BY u.id, u.nombre, u.email, u.telefono
        ORDER BY appointments_count DESC
      `;
      logger.info(`[REPORTES] getStaff - Query:`, { staffQuery });
      const [results] = await db.execute(staffQuery, [company_id]);
      logger.info(`[REPORTES] getStaff - Result:`, results);
      res.json(results);
    } catch (error) {
      logger.error('Error fetching staff report:', error);
      handleError(res, error, 'Error al obtener reporte de personal');
    }
  }

  /**
   * Obtener reporte de clientes
   */
  async getClients(req, res) {
    try {
      const { company_id = 1 } = req.query;
      logger.info(`[REPORTES] getClients - Params:`, { company_id });
      const clientsQuery = `
        SELECT
          c.id,
          CONCAT(c.nombre, ' ', c.apellido) as name,
          c.email,
          c.telefono,
          COUNT(a.id) as appointments_count,
          SUM(CASE WHEN a.estado = 'Completada' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN a.estado = 'Completada' THEN s.precio ELSE 0 END) as total_spent,
          MAX(a.fecha) as last_appointment
        FROM usuarios c
        LEFT JOIN citas a ON c.id = a.cliente_id
        LEFT JOIN servicios s ON a.servicio_id = s.id
        WHERE c.empresa_id = ? AND c.estado = 'activo'
        GROUP BY c.id, c.nombre, c.apellido, c.email, c.telefono
        ORDER BY total_spent DESC
      `;
      logger.info(`[REPORTES] getClients - Query:`, { clientsQuery });
      const [results] = await db.execute(clientsQuery, [company_id]);
      logger.info(`[REPORTES] getClients - Result:`, results);
      res.json(results);
    } catch (error) {
      logger.error('Error fetching clients report:', error);
      handleError(res, error, 'Error al obtener reporte de clientes');
    }
  }

  /**
   * Obtener ventas por mes
   */
  async getSalesByMonth(req, res) {
    try {
      const { company_id = 1, year } = req.query;
      const targetYear = year || new Date().getFullYear();
      logger.info(`[REPORTES] getSalesByMonth - Params:`, { company_id, targetYear });
      const salesQuery = `
        SELECT
          MONTH(a.fecha) as month,
          MONTHNAME(a.fecha) as month_name,
          COUNT(a.id) as appointments_count,
          SUM(s.precio) as revenue
        FROM citas a
        JOIN servicios s ON a.servicio_id = s.id
        WHERE a.empresa_id = ? AND YEAR(a.fecha) = ? AND a.estado = 'Completada'
        GROUP BY MONTH(a.fecha), MONTHNAME(a.fecha)
        ORDER BY month ASC
      `;
      logger.info(`[REPORTES] getSalesByMonth - Query:`, { salesQuery });
      const [results] = await db.execute(salesQuery, [company_id, targetYear]);
      logger.info(`[REPORTES] getSalesByMonth - Result:`, results);
      res.json(results);
    } catch (error) {
      logger.error('Error fetching sales by month:', error);
      handleError(res, error, 'Error al obtener ventas por mes');
    }
  }

  /**
   * Obtener estado de citas por d�a
   */
  async getAppointmentsStatusByDay(req, res) {
    try {
      const { company_id = 1, start_date, end_date } = req.query;
      logger.info(`[REPORTES] getAppointmentsStatusByDay - Params:`, { company_id, start_date, end_date });
      const dateFilter = start_date && end_date ?
        `AND a.fecha BETWEEN '${start_date}' AND '${end_date}'` :
        'AND a.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';

      const statusQuery = `
        SELECT
          DATE(a.fecha) as date,
          a.estado as status,
          COUNT(*) as count
        FROM citas a
        WHERE a.empresa_id = ? ${dateFilter}
        GROUP BY DATE(a.fecha), a.estado
        ORDER BY date ASC, a.estado
      `;
      logger.info(`[REPORTES] getAppointmentsStatusByDay - Query:`, { statusQuery });
      const [results] = await db.execute(statusQuery, [company_id]);
      logger.info(`[REPORTES] getAppointmentsStatusByDay - Result:`, results);
      res.json(results);
    } catch (error) {
      logger.error('Error fetching appointments status by day:', error);
      handleError(res, error, 'Error al obtener estado de citas por día');
    }
  }

  /**
   * Obtener ratio de completitud de servicios
   */
  async getServicesCompletionRatio(req, res) {
    try {
      const { company_id = 1 } = req.query;
      logger.info(`[REPORTES] getServicesCompletionRatio - Params:`, { company_id });
      const completionQuery = `
        SELECT
          s.nombre as service_name,
          COUNT(a.id) as total_appointments,
          SUM(CASE WHEN a.estado = 'Completada' THEN 1 ELSE 0 END) as completed_appointments,
          SUM(CASE WHEN a.estado = 'Cancelada' THEN 1 ELSE 0 END) as cancelled_appointments,
          ROUND(
            (SUM(CASE WHEN a.estado = 'Completada' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100,
            2
          ) as completion_rate
        FROM servicios s
        LEFT JOIN citas a ON s.id = a.servicio_id
        WHERE s.empresa_id = ? AND s.estado = 0
        GROUP BY s.id, s.nombre
        HAVING total_appointments > 0
        ORDER BY completion_rate DESC
      `;
      logger.info(`[REPORTES] getServicesCompletionRatio - Query:`, { completionQuery });
      const [results] = await db.execute(completionQuery, [company_id]);
      logger.info(`[REPORTES] getServicesCompletionRatio - Result:`, results);
      res.json(results);
    } catch (error) {
      logger.error('Error fetching services completion ratio:', error);
      handleError(res, error, 'Error al obtener ratio de completitud de servicios');
    }
  }
}

module.exports = new ReportesController();
