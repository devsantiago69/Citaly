const { db } = require('../config/db');
const logger = require('../logger');

// Búsqueda global en el sistema
const globalSearch = async (req, res) => {
  try {
    const { term, type } = req.query;
    const companyId = req.companyId;
    const searchTerm = `%${term}%`;

    if (!term || term.length < 1) {
      return res.json([]);
    }

    let query = '';
    let queryParams = [];
    let results = [];

    switch (type) {
      case 'client':
        query = `
          SELECT
            id,
            CONCAT(first_name, ' ', last_name) as name,
            email,
            phone,
            'client' as type
          FROM clients
          WHERE company_id = ? AND (
            CONCAT(first_name, ' ', last_name) LIKE ? OR
            email LIKE ? OR
            phone LIKE ? OR
            document_number LIKE ?
          )
          LIMIT 10
        `;
        queryParams = [companyId, searchTerm, searchTerm, searchTerm, searchTerm];
        break;

      case 'service':
        query = `
          SELECT
            id,
            name,
            description,
            price,
            'service' as type
          FROM services
          WHERE company_id = ? AND (
            name LIKE ? OR
            description LIKE ?
          )
          LIMIT 10
        `;
        queryParams = [companyId, searchTerm, searchTerm];
        break;

      case 'staff':
        query = `
          SELECT
            id,
            name,
            email,
            role,
            'staff' as type
          FROM users
          WHERE company_id = ? AND role = 'staff' AND (
            name LIKE ? OR
            email LIKE ?
          )
          LIMIT 10
        `;
        queryParams = [companyId, searchTerm, searchTerm];
        break;

      case 'appointment':
        query = `
          SELECT
            a.id,
            a.date,
            a.time,
            a.status,
            c.name as client_name,
            s.name as service_name,
            'appointment' as type
          FROM appointments a
          JOIN users c ON a.client_id = c.id
          JOIN services s ON a.service_id = s.id
          WHERE a.company_id = ? AND (
            c.name LIKE ? OR
            s.name LIKE ? OR
            a.notes LIKE ?
          )
          ORDER BY a.date DESC
          LIMIT 10
        `;
        queryParams = [companyId, searchTerm, searchTerm, searchTerm];
        break;

      default:
        // Búsqueda global en todas las entidades
        const clientsQuery = db.query(`
          SELECT
            id,
            CONCAT(first_name, ' ', last_name) as name,
            email,
            'client' as type
          FROM clients
          WHERE company_id = ? AND CONCAT(first_name, ' ', last_name) LIKE ?
          LIMIT 5
        `, [companyId, searchTerm]);

        const servicesQuery = db.query(`
          SELECT
            id,
            name,
            description,
            'service' as type
          FROM services
          WHERE company_id = ? AND name LIKE ?
          LIMIT 5
        `, [companyId, searchTerm]);

        const staffQuery = db.query(`
          SELECT
            id,
            name,
            email,
            'staff' as type
          FROM users
          WHERE company_id = ? AND role = 'staff' AND name LIKE ?
          LIMIT 5
        `, [companyId, searchTerm]);

        // Ejecutar todas las consultas y combinar resultados
        Promise.all([clientsQuery, servicesQuery, staffQuery])
          .then(results => {
            const combined = [
              ...results[0],
              ...results[1],
              ...results[2]
            ];
            res.json(combined);
          })
          .catch(error => {
            logger.error('Error in global search:', error);
            res.status(500).json({ error: 'Error en búsqueda global' });
          });
        return;
    }

    db.query(query, queryParams, (err, results) => {
      if (err) {
        logger.error(`Error en búsqueda para tipo '${type}' con término '${term}':`, {
          message: err.message,
          code: err.code,
          sqlMessage: err.sqlMessage,
        });
        return res.status(500).json({ error: 'Error en la búsqueda' });
      }

      res.json(results);
    });

  } catch (error) {
    logger.error(`Error en búsqueda para tipo '${type}' con término '${term}':`, {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener países
const getCountries = async (req, res) => {
  try {
    const locationData = {
      countries: [
        {
          code: "CL",
          name: "Chile",
          states: [
            { code: "RM", name: "Región Metropolitana de Santiago" },
            { code: "VS", name: "Valparaíso" },
            { code: "BI", name: "Biobío" },
            { code: "AR", name: "La Araucanía" }
          ]
        },
        {
          code: "CO",
          name: "Colombia",
          states: [
            { code: "ANT", name: "Antioquia" },
            { code: "BOG", name: "Bogotá" },
            { code: "VAC", name: "Valle del Cauca" },
            { code: "ATL", name: "Atlántico" }
          ]
        },
        {
          code: "MX",
          name: "México",
          states: [
            { code: "CMX", name: "Ciudad de México" },
            { code: "JAL", name: "Jalisco" },
            { code: "NLE", name: "Nuevo León" },
            { code: "PUE", name: "Puebla" }
          ]
        }
      ]
    };

    const countries = locationData.countries.map(c => ({
      code: c.code,
      name: c.name
    }));

    res.json(countries);
  } catch (error) {
    logger.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Error getting countries list' });
  }
};

// Obtener estados de un país
const getStates = async (req, res) => {
  try {
    const { countryCode } = req.params;

    const locationData = {
      countries: [
        {
          code: "CL",
          name: "Chile",
          states: [
            { code: "RM", name: "Región Metropolitana de Santiago" },
            { code: "VS", name: "Valparaíso" },
            { code: "BI", name: "Biobío" },
            { code: "AR", name: "La Araucanía" }
          ]
        },
        {
          code: "CO",
          name: "Colombia",
          states: [
            { code: "ANT", name: "Antioquia" },
            { code: "BOG", name: "Bogotá" },
            { code: "VAC", name: "Valle del Cauca" },
            { code: "ATL", name: "Atlántico" }
          ]
        },
        {
          code: "MX",
          name: "México",
          states: [
            { code: "CMX", name: "Ciudad de México" },
            { code: "JAL", name: "Jalisco" },
            { code: "NLE", name: "Nuevo León" },
            { code: "PUE", name: "Puebla" }
          ]
        }
      ]
    };

    const country = locationData.countries.find(c => c.code === countryCode);

    if (country) {
      res.json(country.states);
    } else {
      res.json([]);
    }
  } catch (error) {
    logger.error('Error fetching states:', error);
    res.status(500).json({ error: 'Error getting states list' });
  }
};

// Logout del sistema
const logout = async (req, res) => {
  try {
    // Aquí se puede agregar lógica para invalidar tokens JWT, limpiar sesiones, etc.
    logger.info('User logged out', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Health check del sistema
const healthCheck = async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development',
      version: '2.0.0'
    };

    // Verificar conexión a la base de datos
    db.query('SELECT 1', (err) => {
      if (err) {
        healthData.status = 'unhealthy';
        healthData.database = 'disconnected';
        healthData.error = err.message;
        return res.status(503).json(healthData);
      } else {
        healthData.database = 'connected';
        res.json(healthData);
      }
    });
  } catch (error) {
    logger.error('Error in health check:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

module.exports = {
  globalSearch,
  getCountries,
  getStates,
  logout,
  healthCheck
};
