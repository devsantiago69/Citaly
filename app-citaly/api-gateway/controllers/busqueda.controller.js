const db = require('../config/db');
const logger = require('../logger');
const { handleError } = require('../utils/helpers');

/**
 * Controlador para búsquedas y utilidades adicionales
 */
class BusquedaController {
  /**
   * Búsqueda global en el sistema
   */
  async globalSearch(req, res) {
    try {
      const { q: searchTerm, type = 'all', company_id = 1 } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          error: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const results = {
        clients: [],
        staff: [],
        services: [],
        appointments: []
      };

      const searchPattern = `%${searchTerm.trim()}%`;

      // Buscar clientes
      if (type === 'all' || type === 'clients') {
        const clientsQuery = `
          SELECT
            c.id,
            CONCAT(c.first_name, ' ', c.last_name) as name,
            c.email,
            c.phone,
            c.status,
            'client' as type
          FROM clients c
          WHERE c.company_id = ? AND (
            CONCAT(c.first_name, ' ', c.last_name) LIKE ? OR
            c.email LIKE ? OR
            c.phone LIKE ? OR
            c.document_number LIKE ?
          )
          LIMIT 10
        `;

        const [clients] = await db.promise().execute(clientsQuery, [
          company_id, searchPattern, searchPattern, searchPattern, searchPattern
        ]);
        results.clients = clients;
      }

      // Buscar personal
      if (type === 'all' || type === 'staff') {
        const staffQuery = `
          SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            'staff' as type
          FROM users u
          WHERE u.company_id = ? AND u.role IN ('staff', 'admin') AND (
            u.name LIKE ? OR
            u.email LIKE ? OR
            u.phone LIKE ?
          )
          LIMIT 10
        `;

        const [staff] = await db.promise().execute(staffQuery, [
          company_id, searchPattern, searchPattern, searchPattern
        ]);
        results.staff = staff;
      }

      // Buscar servicios
      if (type === 'all' || type === 'services') {
        const servicesQuery = `
          SELECT
            s.id,
            s.name,
            s.description,
            s.price,
            s.duration,
            sc.name as category,
            'service' as type
          FROM services s
          LEFT JOIN service_categories sc ON s.category_id = sc.id
          WHERE s.company_id = ? AND s.active = 1 AND (
            s.name LIKE ? OR
            s.description LIKE ? OR
            sc.name LIKE ?
          )
          LIMIT 10
        `;

        const [services] = await db.promise().execute(servicesQuery, [
          company_id, searchPattern, searchPattern, searchPattern
        ]);
        results.services = services;
      }

      // Buscar citas
      if (type === 'all' || type === 'appointments') {
        const appointmentsQuery = `
          SELECT
            a.id,
            a.date,
            a.time,
            a.status,
            CONCAT(c.first_name, ' ', c.last_name) as client_name,
            s.name as service_name,
            u.name as staff_name,
            'appointment' as type
          FROM appointments a
          LEFT JOIN clients c ON a.client_id = c.id
          LEFT JOIN services s ON a.service_id = s.id
          LEFT JOIN users u ON a.staff_id = u.id
          WHERE a.company_id = ? AND (
            CONCAT(c.first_name, ' ', c.last_name) LIKE ? OR
            s.name LIKE ? OR
            u.name LIKE ? OR
            a.notes LIKE ?
          )
          ORDER BY a.date DESC
          LIMIT 10
        `;

        const [appointments] = await db.promise().execute(appointmentsQuery, [
          company_id, searchPattern, searchPattern, searchPattern, searchPattern
        ]);
        results.appointments = appointments;
      }

      // Calcular totales
      const totals = {
        clients: results.clients.length,
        staff: results.staff.length,
        services: results.services.length,
        appointments: results.appointments.length,
        total: results.clients.length + results.staff.length + results.services.length + results.appointments.length
      };

      res.json({
        searchTerm,
        type,
        results,
        totals
      });

    } catch (error) {
      logger.error('Error in global search:', error);
      handleError(res, error, 'Error en la búsqueda global');
    }
  }

  /**
   * Obtener lista de países
   */
  async getCountries(req, res) {
    try {
      // Lista básica de países
      const countries = [
        { code: 'CO', name: 'Colombia' },
        { code: 'US', name: 'Estados Unidos' },
        { code: 'MX', name: 'México' },
        { code: 'AR', name: 'Argentina' },
        { code: 'PE', name: 'Perú' },
        { code: 'CL', name: 'Chile' },
        { code: 'EC', name: 'Ecuador' },
        { code: 'VE', name: 'Venezuela' },
        { code: 'BR', name: 'Brasil' },
        { code: 'UY', name: 'Uruguay' },
        { code: 'PY', name: 'Paraguay' },
        { code: 'BO', name: 'Bolivia' },
        { code: 'PA', name: 'Panamá' },
        { code: 'CR', name: 'Costa Rica' },
        { code: 'GT', name: 'Guatemala' },
        { code: 'SV', name: 'El Salvador' },
        { code: 'HN', name: 'Honduras' },
        { code: 'NI', name: 'Nicaragua' },
        { code: 'ES', name: 'España' }
      ];

      res.json(countries);
    } catch (error) {
      logger.error('Error fetching countries:', error);
      handleError(res, error, 'Error al obtener países');
    }
  }

  /**
   * Obtener estados/departamentos por país
   */
  async getStates(req, res) {
    try {
      const { countryCode } = req.params;

      // Estados básicos para Colombia (ejemplo)
      const states = {
        'CO': [
          { code: 'ANT', name: 'Antioquia' },
          { code: 'BOG', name: 'Bogotá D.C.' },
          { code: 'VAL', name: 'Valle del Cauca' },
          { code: 'ATL', name: 'Atlántico' },
          { code: 'SAN', name: 'Santander' },
          { code: 'BOL', name: 'Bolívar' },
          { code: 'CUN', name: 'Cundinamarca' },
          { code: 'NOR', name: 'Norte de Santander' },
          { code: 'COR', name: 'Córdoba' },
          { code: 'CAL', name: 'Caldas' }
        ]
      };

      res.json(states[countryCode] || []);
    } catch (error) {
      logger.error('Error fetching states:', error);
      handleError(res, error, 'Error al obtener estados');
    }
  }

  /**
   * Logout del usuario
   */
  async logout(req, res) {
    try {
      // En una implementación real, aquí se invalidaría el token JWT
      // o se limpiaría la sesión del usuario

      logger.info('User logout', {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      logger.error('Error in logout:', error);
      handleError(res, error, 'Error al cerrar sesión');
    }
  }
}

module.exports = new BusquedaController();
