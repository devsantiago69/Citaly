const { db } = require('../config/db');
const logger = require('../logger');

class CitasService {

  // Validar disponibilidad de horario
  static async validateTimeSlot(staffId, date, time, appointmentId = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT COUNT(*) as count
        FROM appointments
        WHERE staff_id = ? AND date = ? AND time = ? AND status != 'cancelled'
      `;
      const params = [staffId, date, time];

      // Si es una actualización, excluir la cita actual
      if (appointmentId) {
        query += ' AND id != ?';
        params.push(appointmentId);
      }

      db.query(query, params, (err, results) => {
        if (err) {
          logger.error('Error validating time slot:', err);
          reject(err);
        } else {
          resolve(results[0].count === 0);
        }
      });
    });
  }

  // Obtener estadísticas de citas
  static async getAppointmentStats(companyId, startDate, endDate) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
          SUM(CASE WHEN status = 'completed' THEN s.price ELSE 0 END) as total_revenue
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.company_id = ? AND a.date BETWEEN ? AND ?
      `;

      db.query(query, [companyId, startDate, endDate], (err, results) => {
        if (err) {
          logger.error('Error getting appointment stats:', err);
          reject(err);
        } else {
          resolve(results[0]);
        }
      });
    });
  }

  // Obtener citas por cliente
  static async getAppointmentsByClient(clientId, companyId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          a.*,
          s.name as service_name,
          s.price as service_price,
          u.name as staff_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        LEFT JOIN users u ON a.staff_id = u.id
        WHERE a.client_id = ? AND a.company_id = ?
        ORDER BY a.date DESC, a.time DESC
      `;

      db.query(query, [clientId, companyId], (err, results) => {
        if (err) {
          logger.error('Error getting appointments by client:', err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  }

  // Obtener próximas citas
  static async getUpcomingAppointments(companyId, limit = 10) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          a.id,
          a.date,
          a.time,
          a.status,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name,
          u.name as staff_name
        FROM appointments a
        JOIN users c ON a.client_id = c.id
        JOIN services s ON a.service_id = s.id
        LEFT JOIN users u ON a.staff_id = u.id
        WHERE a.company_id = ?
        AND a.date >= CURDATE()
        AND a.status = 'scheduled'
        ORDER BY a.date ASC, a.time ASC
        LIMIT ?
      `;

      db.query(query, [companyId, limit], (err, results) => {
        if (err) {
          logger.error('Error getting upcoming appointments:', err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  }

  // Obtener citas del día
  static async getTodayAppointments(companyId) {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      const query = `
        SELECT
          a.*,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name,
          s.duration as service_duration,
          u.name as staff_name
        FROM appointments a
        JOIN users c ON a.client_id = c.id
        JOIN services s ON a.service_id = s.id
        LEFT JOIN users u ON a.staff_id = u.id
        WHERE a.company_id = ? AND a.date = ?
        ORDER BY a.time ASC
      `;

      db.query(query, [companyId, today], (err, results) => {
        if (err) {
          logger.error('Error getting today appointments:', err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  }
}

module.exports = CitasService;
