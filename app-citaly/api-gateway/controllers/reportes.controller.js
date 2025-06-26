const db = require('../config/db');
const logger = require('../logger');
const { handleError } = require('../utils/helpers');

/**
 * Controlador para gestión de reportes y estadísticas
 */
class ReportesController {
  /**
   * Obtener resumen general de la empresa
   */
  async getOverview(req, res) {
    try {
      const { company_id = 1 } = req.query;

      // Obtener estadísticas principales
      const overviewQuery = `
        SELECT
          (SELECT COUNT(*) FROM appointments WHERE company_id = ? AND status = 'completed') as total_appointments,
          (SELECT COUNT(*) FROM appointments WHERE company_id = ? AND DATE(date) = CURDATE()) as today_appointments,
          (SELECT COUNT(*) FROM users WHERE company_id = ? AND role = 'client' AND active = 1) as total_clients,
          (SELECT COUNT(*) FROM users WHERE company_id = ? AND role = 'staff' AND active = 1) as total_staff,
          (SELECT SUM(price) FROM appointments a JOIN services s ON a.service_id = s.id WHERE a.company_id = ? AND a.status = 'completed' AND MONTH(a.date) = MONTH(CURDATE())) as monthly_revenue,
          (SELECT AVG(price) FROM services WHERE company_id = ? AND active = 1) as avg_service_price
      `;

      const [overviewResults] = await db.promise().execute(overviewQuery, [company_id, company_id, company_id, company_id, company_id, company_id]);

      // Obtener citas recientes
      const recentAppointmentsQuery = `
        SELECT
          a.id,
          a.date,
          a.time,
          a.status,
          c.name as client_name,
          s.name as service_name,
          s.price
        FROM appointments a
        JOIN users c ON a.client_id = c.id
        JOIN services s ON a.service_id = s.id
        WHERE a.company_id = ?
        ORDER BY a.date DESC, a.time DESC
        LIMIT 5
      `;

      const [recentAppointments] = await db.promise().execute(recentAppointmentsQuery, [company_id]);

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

      let dateFilter = '';
      let groupBy = '';

      if (period === 'month') {
        groupBy = 'YEAR(a.date), MONTH(a.date)';
        dateFilter = start_date && end_date ?
          `AND a.date BETWEEN '${start_date}' AND '${end_date}'` :
          'AND a.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)';
      } else if (period === 'week') {
        groupBy = 'YEAR(a.date), WEEK(a.date)';
        dateFilter = start_date && end_date ?
          `AND a.date BETWEEN '${start_date}' AND '${end_date}'` :
          'AND a.date >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)';
      } else {
        groupBy = 'DATE(a.date)';
        dateFilter = start_date && end_date ?
          `AND a.date BETWEEN '${start_date}' AND '${end_date}'` :
          'AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      }

      const revenueQuery = `
        SELECT
          ${period === 'month' ? 'CONCAT(YEAR(a.date), "-", LPAD(MONTH(a.date), 2, "0"))' :
            period === 'week' ? 'CONCAT(YEAR(a.date), "-W", LPAD(WEEK(a.date), 2, "0"))' :
            'DATE(a.date)'} as period,
          SUM(s.price) as revenue,
          COUNT(a.id) as appointments_count
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.company_id = ? AND a.status = 'completed' ${dateFilter}
        GROUP BY ${groupBy}
        ORDER BY period ASC
      `;

      const [results] = await db.promise().execute(revenueQuery, [company_id]);

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

      const servicesQuery = `
        SELECT
          s.id,
          s.name,
          s.price,
          s.duration,
          sc.name as category,
          COUNT(a.id) as appointments_count,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END) as revenue
        FROM services s
        LEFT JOIN service_categories sc ON s.category_id = sc.id
        LEFT JOIN appointments a ON s.id = a.service_id
        WHERE s.company_id = ? AND s.active = 1
        GROUP BY s.id, s.name, s.price, s.duration, sc.name
        ORDER BY appointments_count DESC
      `;

      const [results] = await db.promise().execute(servicesQuery, [company_id]);

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

      const staffQuery = `
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          COUNT(a.id) as appointments_count,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END) as revenue,
          ROUND(AVG(CASE WHEN a.status = 'completed' THEN s.price END), 2) as avg_service_price
        FROM users u
        LEFT JOIN appointments a ON u.id = a.staff_id
        LEFT JOIN services s ON a.service_id = s.id
        WHERE u.company_id = ? AND u.role = 'staff' AND u.active = 1
        GROUP BY u.id, u.name, u.email, u.phone
        ORDER BY appointments_count DESC
      `;

      const [results] = await db.promise().execute(staffQuery, [company_id]);

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

      const clientsQuery = `
        SELECT
          c.id,
          CONCAT(c.first_name, ' ', c.last_name) as name,
          c.email,
          c.phone,
          COUNT(a.id) as appointments_count,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END) as total_spent,
          MAX(a.date) as last_appointment
        FROM clients c
        LEFT JOIN appointments a ON c.id = a.client_id
        LEFT JOIN services s ON a.service_id = s.id
        WHERE c.company_id = ? AND c.status = 'active'
        GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone
        ORDER BY total_spent DESC
      `;

      const [results] = await db.promise().execute(clientsQuery, [company_id]);

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

      const salesQuery = `
        SELECT
          MONTH(a.date) as month,
          MONTHNAME(a.date) as month_name,
          COUNT(a.id) as appointments_count,
          SUM(s.price) as revenue
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.company_id = ? AND YEAR(a.date) = ? AND a.status = 'completed'
        GROUP BY MONTH(a.date), MONTHNAME(a.date)
        ORDER BY month ASC
      `;

      const [results] = await db.promise().execute(salesQuery, [company_id, targetYear]);

      res.json(results);

    } catch (error) {
      logger.error('Error fetching sales by month:', error);
      handleError(res, error, 'Error al obtener ventas por mes');
    }
  }

  /**
   * Obtener estado de citas por día
   */
  async getAppointmentsStatusByDay(req, res) {
    try {
      const { company_id = 1, start_date, end_date } = req.query;

      const dateFilter = start_date && end_date ?
        `AND a.date BETWEEN '${start_date}' AND '${end_date}'` :
        'AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';

      const statusQuery = `
        SELECT
          DATE(a.date) as date,
          a.status,
          COUNT(*) as count
        FROM appointments a
        WHERE a.company_id = ? ${dateFilter}
        GROUP BY DATE(a.date), a.status
        ORDER BY date ASC, a.status
      `;

      const [results] = await db.promise().execute(statusQuery, [company_id]);

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

      const completionQuery = `
        SELECT
          s.name as service_name,
          COUNT(a.id) as total_appointments,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
          SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_appointments,
          ROUND(
            (SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100,
            2
          ) as completion_rate
        FROM services s
        LEFT JOIN appointments a ON s.id = a.service_id
        WHERE s.company_id = ? AND s.active = 1
        GROUP BY s.id, s.name
        HAVING total_appointments > 0
        ORDER BY completion_rate DESC
      `;

      const [results] = await db.promise().execute(completionQuery, [company_id]);

      res.json(results);

    } catch (error) {
      logger.error('Error fetching services completion ratio:', error);
      handleError(res, error, 'Error al obtener ratio de completitud de servicios');
    }
  }
}

module.exports = new ReportesController();
