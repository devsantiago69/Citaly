const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const logger = require('./logger');
require('dotenv').config();

// Establecer la zona horaria para toda la aplicación
process.env.TZ = 'America/Bogota';

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Aplicar CORS a todas las rutas
app.use(cors());

app.use(express.json());

// Logging middleware para depurar las solicitudes
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    headers: req.headers,
    origin: req.get('origin'),
    ip: req.ip
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Test del sistema de logs
logger.info('Initializing server', {
    time: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform
});

// Crear conexión a la base de datos existente
const db = mysql.createPool({
  host: 'localhost',  // XAMPP usa localhost
  user: 'root',      // Usuario por defecto de XAMPP
  password: '',      // XAMPP no tiene contraseña por defecto
  database: 'citaly',
  waitForConnections: true,
  connectionLimit: 10
});

// Verificar la conexión
db.getConnection((err, connection) => {
  if (err) {
    logger.error('Error al conectar con la base de datos:', err);
    process.exit(1);
  }
  logger.info('Conectado correctamente a la base de datos MySQL');
  connection.release();
});

const handleQuery = (res, query, params = []) => {
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Query Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

app.get('/', (req, res) => {
  res.send('Backend server is running.');
});

// GET services
app.get('/api/services', (req, res) => {
  logger.info('GET /api/services - Request received', {
    origin: req.get('origin'),
    headers: req.headers
  });
  
  const query = `
    SELECT s.*, sc.name as category 
    FROM services s 
    LEFT JOIN service_categories sc ON s.category_id = sc.id 
    WHERE s.company_id = 1
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      logger.error('Error fetching services:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// GET clients (for UserManagement)
app.get('/api/clients', (req, res) => {
  logger.info('GET /api/clients - Request received', { query: req.query });

  const {
    searchTerm,
    status,
    city,
    country,
    hasAppointments, // 'yes' or 'no'
    startDate, // for created_at range
    endDate,   // for created_at range
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;

  let query = `
    SELECT
      c.*,
      CONCAT(
        COALESCE(NULLIF(c.total_appointments, 0), 0), ' citas, ',
        COALESCE(NULLIF(c.completed_appointments, 0), 0), ' completadas'
      ) as appointment_summary
    FROM clients c
    WHERE c.company_id = ?
  `;
  const queryParams = [1];

  if (searchTerm) {
    query += ` AND (
      CONCAT(c.first_name, ' ', c.last_name) LIKE ? OR
      c.email LIKE ? OR
      c.phone LIKE ? OR
      c.document_number LIKE ?
    )`;
    const searchTermLike = `%${searchTerm}%`;
    queryParams.push(searchTermLike, searchTermLike, searchTermLike, searchTermLike);
  }

  if (status && status !== 'all') {
    query += ' AND c.status = ?';
    queryParams.push(status);
  }

  if (city) {
    query += ' AND c.city LIKE ?';
    queryParams.push(`%${city}%`);
  }

  if (country) {
    query += ' AND c.country LIKE ?';
    queryParams.push(`%${country}%`);
  }

  if (hasAppointments === 'yes') {
    query += ' AND c.total_appointments > 0';
  } else if (hasAppointments === 'no') {
    query += ' AND (c.total_appointments IS NULL OR c.total_appointments = 0)';
  }

  if (startDate && endDate) {
    query += ' AND DATE(c.created_at) BETWEEN ? AND ?';
    queryParams.push(startDate, endDate);
  }

  const validSortBy = ['created_at', 'last_name', 'total_spent', 'total_appointments'];
  const validSortOrder = ['ASC', 'DESC'];
  const finalSortBy = validSortBy.includes(sortBy) ? `c.${sortBy}` : 'c.created_at';
  const finalSortOrder = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  query += ` ORDER BY ${finalSortBy} ${finalSortOrder}`;

  db.query(query, queryParams, (err, results) => {
    if (err) {
      logger.error('Error fetching clients', {
        error: err.message,
        stack: err.stack
      });
      return res.status(500).json({ error: 'Error al cargar los clientes' });
    }

    // Formatear las preferencias de comunicación y las fechas
    const formattedResults = results.map(client => ({
      ...client,
      communication_preferences: client.communication_preferences
        ? client.communication_preferences.split(',')
        : [],
      birth_date: client.birth_date ? new Date(client.birth_date).toISOString().split('T')[0] : null,
      last_visit: client.last_visit ? new Date(client.last_visit).toISOString().split('T')[0] : null,
      created_at: new Date(client.created_at).toISOString(),
      updated_at: client.updated_at ? new Date(client.updated_at).toISOString() : null,
      // Asegurarse de que los campos numéricos sean números
      total_appointments: Number(client.total_appointments) || 0,
      completed_appointments: Number(client.completed_appointments) || 0,
      cancelled_appointments: Number(client.cancelled_appointments) || 0,
      total_spent: Number(client.total_spent) || 0,
      avg_rating: client.avg_rating ? Number(client.avg_rating) : null
    }));

    logger.info('Clients fetched successfully', {
      count: formattedResults.length,
      timestamp: new Date().toISOString()
    });

    res.json(formattedResults);
  });
});

// GET staff
app.get('/api/staff', (req, res) => {
  const query = `
    SELECT 
      u.id, 
      u.name, 
      u.email, 
      u.phone, 
      u.role,
      u.active,
      (SELECT COUNT(*) FROM appointments WHERE staff_id = u.id) as appointments
    FROM users u
    WHERE u.role = 'staff' AND u.company_id = 1
  `;
  handleQuery(res, query);
});

// POST /api/staff
app.post('/api/staff', (req, res) => {
  const { name, email, phone, role } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nombre, email y cargo son requeridos.' });
  }

  const query = `
    INSERT INTO users (company_id, name, email, phone, role, active) 
    VALUES (1, ?, ?, ?, ?, 1)
  `;
  db.query(query, [name, email, phone, role], (err, results) => {
    if (err) {
      logger.error('Error creating staff:', err);
      return res.status(500).json({ error: err.message });
    }
    const newStaffId = results.insertId;
    db.query('SELECT *, (SELECT COUNT(*) FROM appointments WHERE staff_id = u.id) as appointments FROM users u WHERE id = ?', [newStaffId], (err, rows) => {
        if (err) {
            logger.error('Error fetching new staff:', err);
            return res.status(500).json({ error: err.message });
        }
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Could not find newly created staff' });
        }
        const newStaffMember = {
            ...rows[0],
            specialties: [],
            rating: 0
        };
        res.status(201).json(newStaffMember);
    });
  });
});

// GET admins
app.get('/api/admins', (req, res) => {
  const query = `
    SELECT 
      id, 
      name, 
      email, 
      role,
      created_at as createdAt,
      '' as lastLogin
    FROM users 
    WHERE role = 'admin' AND company_id = 1
  `;
  handleQuery(res, query);
});

// ===== USER TYPES ENDPOINTS =====

// GET all user types for a company
app.get('/api/user-types', (req, res) => {
  const { company_id = 1 } = req.query;
  const query = `
    SELECT 
      ut.id,
      ut.company_id,
      ut.name,
      ut.description,
      ut.permissions,
      ut.level,
      ut.active,
      ut.created_at as createdAt,
      ut.updated_at as updatedAt,
      u.name as createdByName
    FROM user_types ut
    LEFT JOIN users u ON ut.created_by = u.id
    WHERE ut.company_id = ? AND ut.active = 1
    ORDER BY ut.level, ut.name
  `;
  
  db.execute(query, [company_id], (err, results) => {
    if (err) {
      logger.error('Error fetching user types:', err);
      res.status(500).json({ error: 'Error fetching user types' });
      return;
    }
    
    // Parse JSON permissions
    const userTypes = results.map(userType => ({
      ...userType,
      permissions: typeof userType.permissions === 'string' 
        ? JSON.parse(userType.permissions) 
        : userType.permissions
    }));
    
    res.json(userTypes);
  });
});

// GET user type by ID
app.get('/api/user-types/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      ut.id,
      ut.company_id,
      ut.name,
      ut.description,
      ut.permissions,
      ut.level,
      ut.active,
      ut.created_at as createdAt,
      ut.updated_at as updatedAt,
      u.name as createdByName
    FROM user_types ut
    LEFT JOIN users u ON ut.created_by = u.id
    WHERE ut.id = ?
  `;
  
  db.execute(query, [id], (err, results) => {
    if (err) {
      logger.error('Error fetching user type:', err);
      res.status(500).json({ error: 'Error fetching user type' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: 'User type not found' });
      return;
    }
    
    const userType = {
      ...results[0],
      permissions: typeof results[0].permissions === 'string' 
        ? JSON.parse(results[0].permissions) 
        : results[0].permissions
    };
    
    res.json(userType);
  });
});

// POST create new user type
app.post('/api/user-types', (req, res) => {
  const { 
    company_id = 1, 
    name, 
    description, 
    permissions = {}, 
    level, 
    created_by = 1 
  } = req.body;
  
  if (!name || !level) {
    return res.status(400).json({ error: 'Name and level are required' });
  }
  
  if (!['admin', 'staff', 'client'].includes(level)) {
    return res.status(400).json({ error: 'Level must be admin, staff, or client' });
  }
  
  const query = `
    INSERT INTO user_types (company_id, name, description, permissions, level, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const permissionsJson = JSON.stringify(permissions);
  
  db.execute(query, [company_id, name, description, permissionsJson, level, created_by], (err, results) => {
    if (err) {
      logger.error('Error creating user type:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'User type name already exists for this company' });
      } else {
        res.status(500).json({ error: 'Error creating user type' });
      }
      return;
    }
    
    const newUserType = {
      id: results.insertId,
      company_id,
      name,
      description,
      permissions,
      level,
      active: true,
      createdAt: new Date().toISOString()
    };
    
    logger.info('User type created:', { id: results.insertId, name, level });
    res.status(201).json(newUserType);
  });
});

// PUT update user type
app.put('/api/user-types/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, permissions, level, active } = req.body;
  
  if (!name || !level) {
    return res.status(400).json({ error: 'Name and level are required' });
  }
  
  if (!['admin', 'staff', 'client'].includes(level)) {
    return res.status(400).json({ error: 'Level must be admin, staff, or client' });
  }
  
  const query = `
    UPDATE user_types 
    SET name = ?, description = ?, permissions = ?, level = ?, active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  const permissionsJson = JSON.stringify(permissions || {});
  const isActive = active !== undefined ? active : true;
  
  db.execute(query, [name, description, permissionsJson, level, isActive, id], (err, results) => {
    if (err) {
      logger.error('Error updating user type:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'User type name already exists for this company' });
      } else {
        res.status(500).json({ error: 'Error updating user type' });
      }
      return;
    }
    
    if (results.affectedRows === 0) {
      res.status(404).json({ error: 'User type not found' });
      return;
    }
    
    logger.info('User type updated:', { id, name, level });
    res.json({ message: 'User type updated successfully' });
  });
});

// DELETE user type (soft delete)
app.delete('/api/user-types/:id', (req, res) => {
  const { id } = req.params;
  
  // First check if the user type is being used by any users
  const checkUsageQuery = 'SELECT COUNT(*) as count FROM users WHERE user_type_id = ? AND active = 1';
  
  db.execute(checkUsageQuery, [id], (err, results) => {
    if (err) {
      logger.error('Error checking user type usage:', err);
      res.status(500).json({ error: 'Error checking user type usage' });
      return;
    }
    
    if (results[0].count > 0) {
      res.status(400).json({ 
        error: 'Cannot delete user type as it is currently assigned to active users',
        usageCount: results[0].count
      });
      return;
    }
    
    // Soft delete the user type
    const deleteQuery = 'UPDATE user_types SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.execute(deleteQuery, [id], (err, results) => {
      if (err) {
        logger.error('Error deleting user type:', err);
        res.status(500).json({ error: 'Error deleting user type' });
        return;
      }
      
      if (results.affectedRows === 0) {
        res.status(404).json({ error: 'User type not found' });
        return;
      }
      
      logger.info('User type deleted:', { id });
      res.json({ message: 'User type deleted successfully' });
    });
  });
});

// ===== END USER TYPES ENDPOINTS =====

// ===== USERS ENDPOINTS =====

// GET all users with their user type information
app.get('/api/users', (req, res) => {
  const { company_id = 1, role, user_type_id, active } = req.query;
  
  let whereClause = 'WHERE u.company_id = ?';
  const queryParams = [company_id];
  
  if (role && role !== 'all') {
    whereClause += ' AND u.role = ?';
    queryParams.push(role);
  }
  
  if (user_type_id) {
    whereClause += ' AND u.user_type_id = ?';
    queryParams.push(user_type_id);
  }
  
  if (active !== undefined) {
    whereClause += ' AND u.active = ?';
    queryParams.push(active === 'true' ? 1 : 0);
  }
  
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      u.active,
      u.created_at as createdAt,
      ut.id as userTypeId,
      ut.name as userTypeName,
      ut.description as userTypeDescription,
      ut.level as userTypeLevel,
      ut.permissions as userTypePermissions,
      (SELECT COUNT(*) FROM appointments WHERE client_id = u.id AND u.role = 'client') as appointments,
      (SELECT COUNT(*) FROM appointments WHERE staff_id = u.id AND u.role = 'staff') as staffAppointments
    FROM users u
    LEFT JOIN user_types ut ON u.user_type_id = ut.id
    ${whereClause}
    ORDER BY u.role, u.name
  `;
  
  db.execute(query, queryParams, (err, results) => {
    if (err) {
      logger.error('Error fetching users:', err);
      res.status(500).json({ error: 'Error fetching users' });
      return;
    }
    
    // Parse JSON permissions and format results
    const users = results.map(user => ({
      ...user,
      userTypePermissions: user.userTypePermissions 
        ? (typeof user.userTypePermissions === 'string' 
          ? JSON.parse(user.userTypePermissions) 
          : user.userTypePermissions)
        : {},
      appointments: user.role === 'client' ? user.appointments : user.staffAppointments
    }));
    
    res.json(users);
  });
});

// GET user by ID with full details
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      u.active,
      u.created_at as createdAt,
      ut.id as userTypeId,
      ut.name as userTypeName,
      ut.description as userTypeDescription,
      ut.level as userTypeLevel,
      ut.permissions as userTypePermissions,
      (SELECT COUNT(*) FROM appointments WHERE client_id = u.id AND u.role = 'client') as clientAppointments,
      (SELECT COUNT(*) FROM appointments WHERE staff_id = u.id AND u.role = 'staff') as staffAppointments
    FROM users u
    LEFT JOIN user_types ut ON u.user_type_id = ut.id
    WHERE u.id = ?
  `;
  
  db.execute(query, [id], (err, results) => {
    if (err) {
      logger.error('Error fetching user:', err);
      res.status(500).json({ error: 'Error fetching user' });
      return;
    }
    
    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const user = {
      ...results[0],
      userTypePermissions: results[0].userTypePermissions 
        ? (typeof results[0].userTypePermissions === 'string' 
          ? JSON.parse(results[0].userTypePermissions) 
          : results[0].userTypePermissions)
        : {},
      appointments: results[0].role === 'client' ? results[0].clientAppointments : results[0].staffAppointments
    };
    
    res.json(user);
  });
});

// POST create new user
app.post('/api/users', (req, res) => {
  const { 
    company_id = 1, 
    user_type_id, 
    name, 
    email, 
    password, 
    phone, 
    role,
    created_by = 1 
  } = req.body;
  
  if (!name || !email || !user_type_id) {
    return res.status(400).json({ error: 'Name, email, and user type are required' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // First, get the user type to determine the role if not provided
  const getUserTypeQuery = 'SELECT level FROM user_types WHERE id = ? AND active = 1';
  
  db.execute(getUserTypeQuery, [user_type_id], (err, userTypeResults) => {
    if (err) {
      logger.error('Error fetching user type:', err);
      res.status(500).json({ error: 'Error validating user type' });
      return;
    }
    
    if (userTypeResults.length === 0) {
      res.status(400).json({ error: 'Invalid user type' });
      return;
    }
    
    const userRole = role || userTypeResults[0].level;
    const hashedPassword = password || `temp${Date.now()}`; // Temporary password if not provided
    
    const query = `
      INSERT INTO users (company_id, user_type_id, name, email, password, phone, role, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.execute(query, [company_id, user_type_id, name, email, hashedPassword, phone, userRole, created_by], (err, results) => {
      if (err) {
        logger.error('Error creating user:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: 'Email already exists' });
        } else {
          res.status(500).json({ error: 'Error creating user' });
        }
        return;
      }
      
      // Get the newly created user with type information
      const getUserQuery = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.phone,
          u.role,
          u.active,
          u.created_at as createdAt,
          ut.name as userTypeName,
          ut.level as userTypeLevel
        FROM users u
        LEFT JOIN user_types ut ON u.user_type_id = ut.id
        WHERE u.id = ?
      `;
      
      db.execute(getUserQuery, [results.insertId], (err, userResults) => {
        if (err) {
          logger.error('Error fetching new user:', err);
          res.status(500).json({ error: 'User created but error fetching details' });
          return;
        }
        
        logger.info('User created:', { id: results.insertId, name, email, role: userRole });
        res.status(201).json(userResults[0]);
      });
    });
  });
});

// PUT update user
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { user_type_id, name, email, phone, active } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  let updateQuery = `
    UPDATE users 
    SET name = ?, email = ?, phone = ?
  `;
  let queryParams = [name, email, phone];
  
  if (user_type_id) {
    updateQuery += ', user_type_id = ?';
    queryParams.push(user_type_id);
  }
  
  if (active !== undefined) {
    updateQuery += ', active = ?';
    queryParams.push(active);
  }
  
  updateQuery += ' WHERE id = ?';
  queryParams.push(id);
  
  db.execute(updateQuery, queryParams, (err, results) => {
    if (err) {
      logger.error('Error updating user:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Error updating user' });
      }
      return;
    }
    
    if (results.affectedRows === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    logger.info('User updated:', { id, name, email });
    res.json({ message: 'User updated successfully' });
  });
});

// DELETE user (soft delete)
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  // Check if user has any appointments
  const checkAppointmentsQuery = `
    SELECT COUNT(*) as count 
    FROM appointments 
    WHERE (client_id = ? OR staff_id = ?) AND status NOT IN ('cancelled', 'completed')
  `;
  
  db.execute(checkAppointmentsQuery, [id, id], (err, results) => {
    if (err) {
      logger.error('Error checking user appointments:', err);
      res.status(500).json({ error: 'Error checking user dependencies' });
      return;
    }
    
    if (results[0].count > 0) {
      res.status(400).json({ 
        error: 'Cannot delete user with active appointments',
        activeAppointments: results[0].count
      });
      return;
    }
    
    // Soft delete the user
    const deleteQuery = 'UPDATE users SET active = 0 WHERE id = ?';
    
    db.execute(deleteQuery, [id], (err, results) => {
      if (err) {
        logger.error('Error deleting user:', err);
        res.status(500).json({ error: 'Error deleting user' });
        return;
      }
      
      if (results.affectedRows === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      logger.info('User deleted:', { id });
      res.json({ message: 'User deleted successfully' });
    });
  });
});

// GET support cases
app.get('/api/support-cases', (req, res) => {
  const query = `
    SELECT 
      id,
      subject,
      description,
      priority,
      status,
      created_at as createdAt
    FROM support_cases
    WHERE company_id = 1
  `;
  handleQuery(res, query);
});

// GET appointments
app.get('/api/appointments', (req, res) => {
  const { date, start_date, end_date } = req.query;
  
  logger.info('GET /api/appointments - Request received', {
    origin: req.get('origin'),
    headers: req.headers,
    date,
    start_date,
    end_date
  });
  
  let whereClause = 'WHERE a.company_id = 1';
  const queryParams = [];

  if (date) {
    whereClause += ' AND a.date = ?';
    queryParams.push(date);
  } else if (start_date && end_date) {
    whereClause += ' AND a.date BETWEEN ? AND ?';
    queryParams.push(start_date, end_date);
  }
    const query = `    SELECT 
      a.id,
      a.date,
      a.time,
      a.status,
      a.client_id,
      a.service_id,
      a.staff_id,
      a.notes,
      c.name as client_name,
      c.phone,
      c.email,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price,
      sc.name as service_category,
      u.name as staff_name
    FROM appointments a
    JOIN users c ON a.client_id = c.id AND c.role = 'client'
    JOIN services s ON a.service_id = s.id
    LEFT JOIN service_categories sc ON s.category_id = sc.id
    LEFT JOIN users u ON a.staff_id = u.id AND u.role = 'staff'
    ${whereClause}
    ORDER BY a.date ASC, a.time ASC
  `;
  
  db.query(query, queryParams, (err, results) => {
    if (err) {
      logger.error('Error fetching appointments:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Formatear los resultados
    const formattedResults = results.map(apt => ({
      id: apt.id,
      date: apt.date,
      time: apt.time,
      status: apt.status,
      client: {
        id: apt.client_id,
        name: apt.client_name,
        phone: apt.phone,
        email: apt.email
      },
      service: {
        id: apt.service_id,
        name: apt.service_name,
        duration: apt.service_duration,
        price: apt.service_price,
        category: apt.service_category
      },
      staff: apt.staff_id ? {
        id: apt.staff_id,
        name: apt.staff_name
      } : null,
      notes: apt.notes
    }));

    res.json(formattedResults);
  });
});

// --- CRUD for Appointments ---
app.post('/api/appointments', (req, res) => {
  const { client_id, service_id, staff_id, date, time } = req.body;
  const query = `
    INSERT INTO appointments (company_id, client_id, service_id, staff_id, date, time, status) 
    VALUES (1, ?, ?, ?, ?, ?, 'scheduled')
  `;
  db.query(query, [client_id, service_id, staff_id, date, time], (err, results) => {
    if (err) {
      console.error('Query Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: results.insertId, ...req.body, status: 'scheduled' });
  });
});

app.put('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const query = 'UPDATE appointments SET status = ? WHERE id = ? AND company_id = 1';
    db.query(query, [status, id], (err, results) => {
        if (err) {
            console.error('Query Error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.json({ message: 'Appointment updated successfully' });
    });
});

app.delete('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM appointments WHERE id = ? AND company_id = 1';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Query Error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.status(204).send();
    });
});

// --- CRUD for Services ---
app.post('/api/services', (req, res) => {
    const { name, description, price, duration, category_id, active } = req.body;
    const query = `
        INSERT INTO services (company_id, name, description, price, duration, category_id, active) 
        VALUES (1, ?, ?, ?, ?, ?, ?)
    `;
    db.query(query, [name, description, price, duration, category_id, active], (err, results) => {
        if (err) {
            console.error('Query Error:', err);
            return res.status(500).json({ error: err.message });
        }
        const newService = {
            id: results.insertId,
            company_id: 1,
            name,
            description,
            price,
            duration,
            category_id,
            active,
            category: null // Will be populated by the GET endpoint
        };
        res.status(201).json(newService);
    });
});

app.put('/api/services/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, price, duration, category_id } = req.body;
    const query = `
        UPDATE services 
        SET name = ?, description = ?, price = ?, duration = ?, category_id = ?
        WHERE id = ? AND company_id = 1
    `;
    db.query(query, [name, description, price, duration, category_id, id], (err, results) => {
        if (err) {
            console.error('Query Error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.json({ message: 'Service updated successfully' });
    });
});

app.delete('/api/services/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM services WHERE id = ? AND company_id = 1';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Query Error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.status(204).send();
    });
});

// --- CRUD for Clients ---
app.post('/api/clients', (req, res) => {
  logger.info('POST /api/clients - Request received', { body: req.body });

  const {
    // Información personal básica
    first_name,
    last_name,
    document_type,
    document_number,
    birth_date,
    gender,

    // Información de contacto
    email,
    phone,
    alternative_phone,
    address,
    city,
    state,
    country,

    // Contacto de emergencia
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,

    // Información médica
    blood_type,
    allergies,
    current_medications,
    medical_conditions,
    medical_notes,
    last_checkup_date,

    // Preferencias
    preferred_staff_id,
    preferred_schedule,
    communication_preferences,
    status
  } = req.body;

  // Validar campos requeridos
  if (!first_name || !last_name || !document_number || !email || !phone) {
    return res.status(400).json({
      error: 'Los campos nombre, apellido, documento, email y teléfono son obligatorios'
    });
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'El formato del email no es válido' });
  }

  // Convertir communication_preferences a SET
  const validPreferences = ['email', 'sms', 'whatsapp', 'phone'];
  const formattedPreferences = Array.isArray(communication_preferences)
    ? communication_preferences.filter(pref => validPreferences.includes(pref))
    : ['email'];

  const query = `
    INSERT INTO clients (
      company_id,
      first_name,
      last_name,
      document_type,
      document_number,
      birth_date,
      gender,
      email,
      phone,
      alternative_phone,
      address,
      city,
      state,
      country,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      blood_type,
      allergies,
      current_medications,
      medical_conditions,
      medical_notes,
      last_checkup_date,
      preferred_staff_id,
      preferred_schedule,
      communication_preferences,
      status,
      created_by
    ) VALUES (
      1,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?,
      ?,
      ?,
      1
    )
  `;

  const values = [
    first_name,
    last_name,
    document_type || 'DNI',
    document_number,
    birth_date || null,
    gender || 'other',
    email,
    phone,
    alternative_phone || null,
    address || null,
    city || null,
    state || null,
    country || 'Colombia',
    emergency_contact_name || null,
    emergency_contact_phone || null,
    emergency_contact_relationship || null,
    blood_type || null,
    allergies || null,
    current_medications || null,
    medical_conditions || null,
    medical_notes || null,
    last_checkup_date || null,
    preferred_staff_id || null,
    preferred_schedule || null,
    formattedPreferences.join(','),
    status || 'active'
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      logger.error('Error creating client', {
        error: err.message,
        stack: err.stack,
        data: req.body
      });
      return res.status(500).json({ error: 'Error al crear el cliente' });
    }

    // Obtener el cliente recién creado
    const getNewClientQuery = `
      SELECT * FROM clients WHERE id = ? AND company_id = 1
    `;

    db.query(getNewClientQuery, [results.insertId], (err, newClient) => {
      if (err) {
        logger.error('Error fetching new client', {
          error: err.message,
          stack: err.stack,
          clientId: results.insertId
        });
        return res.status(500).json({ error: 'Error al obtener los datos del cliente' });
      }

      logger.info('Client created successfully', {
        clientId: results.insertId,
        timestamp: new Date().toISOString()
      });

      res.status(201).json(newClient[0]);
    });
  });
});

app.put('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  logger.info(`PUT /api/clients/${id} - Request received`, { body: req.body });

  const {
    first_name,
    last_name,
    document_type,
    document_number,
    birth_date,
    gender,
    email,
    phone,
    alternative_phone,
    address,
    city,
    state,
    country,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    blood_type,
    allergies,
    current_medications,
    medical_conditions,
    medical_notes,
    last_checkup_date,
    preferred_staff_id,
    preferred_schedule,
    communication_preferences,
    status
  } = req.body;

  // Validar campos requeridos
  if (!first_name || !last_name || !document_number || !email || !phone) {
    return res.status(400).json({
      error: 'Los campos nombre, apellido, documento, email y teléfono son obligatorios'
    });
  }

  // Formatear preferencias de comunicación
  const validPreferences = ['email', 'sms', 'whatsapp', 'phone'];
  const formattedPreferences = Array.isArray(communication_preferences)
    ? communication_preferences.filter(pref => validPreferences.includes(pref))
    : ['email'];

  const query = `
    UPDATE clients
    SET
      first_name = ?,
      last_name = ?,
      document_type = ?,
      document_number = ?,
      birth_date = ?,
      gender = ?,
      email = ?,
      phone = ?,
      alternative_phone = ?,
      address = ?,
      city = ?,
      state = ?,
      country = ?,
      emergency_contact_name = ?,
      emergency_contact_phone = ?,
      emergency_contact_relationship = ?,
      blood_type = ?,
      allergies = ?,
      current_medications = ?,
      medical_conditions = ?,
      medical_notes = ?,
      last_checkup_date = ?,
      preferred_staff_id = ?,
      preferred_schedule = ?,
      communication_preferences = ?,
      status = ?,
      updated_by = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = 1
  `;

  const values = [
    first_name,
    last_name,
    document_type || 'DNI',
    document_number,
    birth_date || null,
    gender || 'other',
    email,
    phone,
    alternative_phone || null,
    address || null,
    city || null,
    state || null,
    country || 'Chile',
    emergency_contact_name || null,
    emergency_contact_phone || null,
    emergency_contact_relationship || null,
    blood_type || null,
    allergies || null,
    current_medications || null,
    medical_conditions || null,
    medical_notes || null,
    last_checkup_date || null,
    preferred_staff_id || null,
    preferred_schedule || null,
    formattedPreferences.join(','),
    status || 'active',
    id
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      logger.error('Error updating client', {
        error: err.message,
        stack: err.stack,
        clientId: id,
        data: req.body
      });
      return res.status(500).json({ error: 'Error al actualizar el cliente' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    logger.info('Client updated successfully', {
      clientId: id,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      message: 'Cliente actualizado correctamente',
      id: parseInt(id)
    });
  });
});

app.delete('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  logger.info(`DELETE /api/clients/${id} - Request received`);

  // Primero verificamos si el cliente tiene citas
  const checkAppointmentsQuery = `
    SELECT COUNT(*) as appointmentCount 
    FROM appointments 
    WHERE client_id = ? AND company_id = 1
  `;

  db.query(checkAppointmentsQuery, [id], (err, results) => {
    if (err) {
      logger.error('Error checking client appointments', {
        error: err.message,
        stack: err.stack,
        clientId: id
      });
      return res.status(500).json({ error: 'Error al verificar las citas del cliente' });
    }

    if (results[0].appointmentCount > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el cliente porque tiene citas registradas' 
      });
    }

    // Si no tiene citas, procedemos a eliminar
    const deleteQuery = 'DELETE FROM clients WHERE id = ? AND company_id = 1';
    
    db.query(deleteQuery, [id], (err, results) => {
      if (err) {
        logger.error('Error deleting client', {
          error: err.message,
          stack: err.stack,
          clientId: id
        });
        return res.status(500).json({ error: 'Error al eliminar el cliente' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      logger.info('Client deleted successfully', {
        clientId: id,
        timestamp: new Date().toISOString()
      });

      res.status(204).send();
    });
  });
});

// --- CRUD for Staff ---
app.post('/api/staff', (req, res) => {
    const { name, email, phone, role } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Nombre, email y cargo son requeridos.' });
    }

    const query = `
      INSERT INTO users (company_id, name, email, phone, role, active) 
      VALUES (1, ?, ?, ?, ?, 1)
    `;
    db.query(query, [name, email, phone, role], (err, results) => {
      if (err) {
        logger.error('Error creating staff:', err);
        return res.status(500).json({ error: err.message });
      }
      const newStaffId = results.insertId;
      db.query('SELECT *, (SELECT COUNT(*) FROM appointments WHERE staff_id = u.id) as appointments FROM users u WHERE id = ?', [newStaffId], (err, rows) => {
          if (err) {
              logger.error('Error fetching new staff:', err);
              return res.status(500).json({ error: err.message });
          }
          if (rows.length === 0) {
              return res.status(404).json({ message: 'Could not find newly created staff' });
          }
          const newStaffMember = {
              ...rows[0],
              specialties: [],
              rating: 0
          };
          res.status(201).json(newStaffMember);
      });
    });
});

// Endpoints duplicados eliminados - se mantienen los endpoints completos más abajo

// GET all specialties
app.get('/api/specialties', (req, res) => {
  console.log('GET /api/specialties - Request received');
  logger.info('API Request received', {
    method: 'GET',
    path: '/api/specialties',
    timestamp: new Date().toISOString()
  });
  
  // No seleccionamos el campo color, solo los existentes
  const query = 'SELECT id, name, description, active FROM specialties WHERE company_id = 1 ORDER BY name';
  logger.info('Executing query', {
    query: query,
    timestamp: new Date().toISOString()
  });
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Database Error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('Query results:', results);
    logger.info('Query executed successfully', {
      count: results.length,
      results: results,
      timestamp: new Date().toISOString()
    });
    
    // Si se requiere color en frontend, se agrega aquí por defecto (no en la DB)
    const resultsWithColor = results.map(specialty => ({
      ...specialty,
      color: '#3B82F6' // Color azul por defecto, solo para UI
    }));
    
    res.json(resultsWithColor);
  });
});

app.post('/api/specialties', (req, res) => {
  console.log('📝 POST /api/specialties - Request received');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  
  const { name, description } = req.body;
  // No insertamos color
  const query = `
    INSERT INTO specialties (company_id, name, description, created_by) 
    VALUES (1, ?, ?, 1)
  `;
  console.log('📝 Query to execute:', query);
  console.log('📝 Query parameters:', [name, description]);
  
  db.query(query, [name, description], (err, results) => {
    if (err) {
      console.error('❌ Database Error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('✅ Query successful');
    console.log('📊 Insert ID:', results.insertId);
    
    // Solo agregamos color por defecto en la respuesta
    const newSpecialty = {
      id: results.insertId,
      name,
      description,
      color: '#3B82F6', // Solo para UI
      active: true
    };
    console.log('📦 Returning:', JSON.stringify(newSpecialty, null, 2));
    
    res.status(201).json(newSpecialty);
  });
});

app.put('/api/specialties/:id', (req, res) => {
  const { id } = req.params;
  console.log(`📝 PUT /api/specialties/${id} - Request received`);
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  
  const { name, description, active } = req.body;
  // No actualizamos color
  const query = `
    UPDATE specialties 
    SET name = ?, description = ?, active = ?
    WHERE id = ? AND company_id = 1
  `;
  console.log('📝 Query to execute:', query);
  console.log('📝 Query parameters:', [name, description, active, id]);
  
  db.query(query, [name, description, active !== undefined ? active : true, id], (err, results) => {
    if (err) {
      console.error('❌ Database Error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('✅ Query successful');
    console.log('📊 Affected rows:', results.affectedRows);
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Especialidad no encontrada' });
    }
    
    // Solo agregamos color por defecto en la respuesta
    const updatedSpecialty = { 
      id: parseInt(id), 
      name, 
      description, 
      color: '#3B82F6', // Solo para UI
      active 
    };
    console.log('📦 Returning:', JSON.stringify(updatedSpecialty, null, 2));
    
    res.json(updatedSpecialty);
  });
});

app.delete('/api/specialties/:id', (req, res) => {
  const { id } = req.params;
  console.log(`❌ DELETE /api/specialties/${id} - Request received`);
  
  // Primero verificamos si la especialidad está siendo usada por algún staff
  const checkUsageQuery = `
    SELECT COUNT(*) as usageCount 
    FROM staff_specialties 
    WHERE specialty_id = ?
  `;
  
  db.query(checkUsageQuery, [id], (err, results) => {
    if (err) {
      console.error('❌ Database Error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (results[0].usageCount > 0) {
      console.log('⚠️ Specialty is in use by staff members');
      return res.status(400).json({ 
        error: 'No se puede eliminar la especialidad porque está asignada a miembros del staff' 
      });
    }
    
    // Si no está en uso, procedemos a eliminar
    const deleteQuery = 'DELETE FROM specialties WHERE id = ? AND company_id = 1';
    console.log('📝 Query to execute:', deleteQuery);
    console.log('📝 Query parameters:', [id]);
    
    db.query(deleteQuery, [id], (err, results) => {
      if (err) {
        console.error('❌ Database Error:', err);
        console.error('Stack:', err.stack);
        return res.status(500).json({ error: err.message });
      }
      
      console.log('✅ Query successful');
      console.log('📊 Affected rows:', results.affectedRows);
      
      if (results.affectedRows === 0) {
        console.log('⚠️ No specialty found with ID:', id);
        return res.status(404).json({ error: 'Specialty not found' });
      }
      
      res.status(204).send();
    });
  });
});

// --- Staff Specialties Management ---
app.get('/api/staff/:staffId/specialties', (req, res) => {
  const { staffId } = req.params;
  console.log(`🔍 GET /api/staff/${staffId}/specialties - Request received`);
  
  const query = `
    SELECT 
      ss.id as assignment_id,
      s.id,
      s.name,
      s.description,
      ss.proficiency_level,
      ss.years_experience,
      ss.certification_info,
      ss.is_primary
    FROM staff_specialties ss
    JOIN specialties s ON ss.specialty_id = s.id
    WHERE ss.staff_id = ? AND s.active = 1
    ORDER BY ss.is_primary DESC, s.name
  `;
  db.query(query, [staffId], (err, results) => {
    if (err) {
      console.error('❌ Database Error:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('✅ Staff specialties retrieved:', results.length);
    // Solo agregamos color por defecto en la respuesta
    const resultsWithColor = results.map(specialty => ({
      ...specialty,
      color: '#3B82F6' // Solo para UI
    }));
    res.json(resultsWithColor);
  });
});

app.post('/api/staff/:staffId/specialties', (req, res) => {
  const { staffId } = req.params;
  const { specialtyId, proficiencyLevel, yearsExperience, certificationInfo, isPrimary } = req.body;
  
  console.log(`📝 POST /api/staff/${staffId}/specialties - Request received`);
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  
  // Si se marca como principal, primero desmarcar otras especialidades principales
  const updatePrimaryQuery = isPrimary ? 
    'UPDATE staff_specialties SET is_primary = FALSE WHERE staff_id = ?' : null;
  
  const insertQuery = `
    INSERT INTO staff_specialties (staff_id, specialty_id, proficiency_level, years_experience, certification_info, is_primary)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const executeInsert = () => {
    db.query(insertQuery, [
      staffId, 
      specialtyId, 
      proficiencyLevel || 'intermediate', 
      yearsExperience || 0, 
      certificationInfo || null, 
      isPrimary || false
    ], (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'El staff ya tiene asignada esta especialidad' });
        }
        console.error('❌ Database Error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      console.log('✅ Specialty assigned successfully');
      res.status(201).json({ 
        id: results.insertId, 
        message: 'Especialidad asignada correctamente' 
      });
    });
  };
  
  if (updatePrimaryQuery && isPrimary) {
    db.query(updatePrimaryQuery, [staffId], (err) => {
      if (err) {
        console.error('❌ Error updating primary status:', err);
        return res.status(500).json({ error: err.message });
      }
      executeInsert();
    });
  } else {
    executeInsert();
  }
});

app.put('/api/staff/:staffId/specialties/:assignmentId', (req, res) => {
  const { staffId, assignmentId } = req.params;
  const { proficiencyLevel, yearsExperience, certificationInfo, isPrimary } = req.body;
  
  console.log(`📝 PUT /api/staff/${staffId}/specialties/${assignmentId} - Request received`);
  
  // Si se marca como principal, primero desmarcar otras especialidades principales
  const updatePrimaryQuery = isPrimary ? 
    'UPDATE staff_specialties SET is_primary = FALSE WHERE staff_id = ? AND id != ?' : null;
  
  const updateQuery = `
    UPDATE staff_specialties 
    SET proficiency_level = ?, years_experience = ?, certification_info = ?, is_primary = ?
    WHERE id = ? AND staff_id = ?
  `;
  
  const executeUpdate = () => {
    db.query(updateQuery, [
      proficiencyLevel || 'intermediate',
      yearsExperience || 0,
      certificationInfo || null,
      isPrimary || false,
      assignmentId,
      staffId
    ], (err, results) => {
      if (err) {
        console.error('❌ Database Error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Asignación de especialidad no encontrada' });
      }
      
      console.log('✅ Specialty assignment updated successfully');
      res.json({ message: 'Especialidad actualizada correctamente' });
    });
  };
  
  if (updatePrimaryQuery && isPrimary) {
    db.query(updatePrimaryQuery, [staffId, assignmentId], (err) => {
      if (err) {
        console.error('❌ Error updating primary status:', err);
        return res.status(500).json({ error: err.message });
      }
      executeUpdate();
    });
  } else {
    executeUpdate();
  }
});

app.delete('/api/staff/:staffId/specialties/:assignmentId', (req, res) => {
  const { staffId, assignmentId } = req.params;
  console.log(`❌ DELETE /api/staff/${staffId}/specialties/${assignmentId} - Request received`);
  
  const query = 'DELETE FROM staff_specialties WHERE id = ? AND staff_id = ?';
  
  db.query(query, [assignmentId, staffId], (err, results) => {
    if (err) {
      console.error('❌ Database Error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Asignación de especialidad no encontrada' });
    }
    
    console.log('✅ Specialty assignment deleted successfully');
    res.status(204).send();
  });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Datos de países y estados (podrías moverlo a un archivo separado más tarde)
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

// Endpoint para obtener países
app.get('/api/countries', (req, res) => {
  try {
    const countries = locationData.countries.map(c => ({
      code: c.code,
      name: c.name
    }));
    res.json(countries);
  } catch (error) {
    logger.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Error getting countries list' });
  }
});

// Endpoint para obtener estados de un país
app.get('/api/states/:countryCode', (req, res) => { res.json(locationData.states); });

// Endpoint para búsqueda global
app.get('/api/search', async (req, res) => {
  const { term, type } = req.query;
  const companyId = 1; // Hardcoded for now
  const searchTerm = `%${term}%`;

  if (!term || term.length < 1) {
    return res.json([]);
  }

  let query = '';
  let queryParams = [];

  try {
    switch (type) {
      case 'client':
        query = `
          SELECT 
            c.id, 
            'client' as type, 
            c.name as title, 
            c.email as subtitle, 
            CONCAT('/clients/', c.id) as route
          FROM users c
          WHERE c.company_id = ? AND c.role = 'client' AND (c.name LIKE ? OR c.email LIKE ?)
          LIMIT 5`;
        queryParams = [companyId, searchTerm, searchTerm];
        break;
      
      case 'service':
        query = `
          SELECT 
            s.id, 
            'service' as type, 
            s.name as title, 
            sc.name as subtitle, 
            CONCAT('/services/', s.id) as route
          FROM services s
          LEFT JOIN service_categories sc ON s.category_id = sc.id
          WHERE s.company_id = ? AND (s.name LIKE ? OR s.description LIKE ? OR sc.name LIKE ?)
          LIMIT 5`;
        queryParams = [companyId, searchTerm, searchTerm, searchTerm];
        break;

      case 'staff':
        query = `
          SELECT 
            u.id, 
            'staff' as type, 
            u.name as title, 
            u.role as subtitle, 
            CONCAT('/staff/', u.id) as route
          FROM users u
          WHERE u.company_id = ? AND u.role = 'staff' AND u.name LIKE ?
          LIMIT 5`;
        queryParams = [companyId, searchTerm];
        break;

      case 'appointment':
        query = `
          SELECT 
            a.id, 
            'appointment' as type, 
            CONCAT('Cita #', a.id, ' - ', c.name) as title, 
            CONCAT(DATE_FORMAT(a.date, '%Y-%m-%d'), ' ', a.time) as subtitle,
            CONCAT('/appointments/', a.id) as route
          FROM appointments a
          JOIN users c ON a.client_id = c.id
          WHERE a.company_id = ? AND a.date LIKE ?
          LIMIT 5`;
        queryParams = [companyId, searchTerm];
        break;      case 'category':
        query = `
          SELECT 
            sc.id, 
            'category' as type, 
            sc.name as title, 
            sc.description as subtitle, 
            CONCAT('/service-categories/', sc.id) as route
          FROM service_categories sc
          WHERE sc.company_id = ? AND sc.name LIKE ?
          LIMIT 5`;
        queryParams = [companyId, searchTerm];
        break;

      case 'specialty':
        query = `
          SELECT 
            s.id, 
            'specialty' as type, 
            s.name as title, 
            s.description as subtitle, 
            CONCAT('/specialties/', s.id) as route
          FROM specialties s
          WHERE s.company_id = ? AND (s.name LIKE ? OR s.description LIKE ?) AND s.active = 1
          LIMIT 5`;
        queryParams = [companyId, searchTerm, searchTerm];
        break;

      default:
        return res.json([]);
    }

    const [results] = await db.promise().query(query, queryParams);
    res.json(results);

  } catch (error) {
    logger.error(`Error en búsqueda para tipo '${type}' con término '${term}':`, {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error en el servidor durante la búsqueda.' });
    }
  }
});

// GET appointments list with date range filter
app.get('/api/appointments/list', (req, res) => { res.json([]); });

// GET calendar events with detailed information
app.get('/api/appointments/calendar', (req, res) => {
  const { year, month } = req.query;
  
  // Calcular el primer y último día del mes
  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = `${year}-${month.padStart(2, '0')}-31`;
  
  const query = `
    SELECT 
      a.id,
      a.date,
      a.time,
      a.status,
      c.name as client_name,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price,
      sc.name as service_category,
      u.name as staff_name,
      COUNT(*) OVER (PARTITION BY a.date) as appointments_per_day,
      SUM(s.price) OVER (PARTITION BY a.date) as revenue_per_day
    FROM appointments a
    JOIN users c ON a.client_id = c.id AND c.role = 'client'
    JOIN services s ON a.service_id = s.id
    LEFT JOIN service_categories sc ON s.category_id = sc.id
    LEFT JOIN users u ON a.staff_id = u.id AND u.role = 'staff'
    WHERE a.company_id = 1 
    AND a.date BETWEEN ? AND ?
    ORDER BY a.date ASC, a.time ASC
  `;

  db.query(query, [startDate, endDate], (err, results) => {
    if (err) {
      logger.error('Error fetching calendar events:', err);
      return res.status(500).json({ error: err.message });
    }

    // Agrupar eventos por día
    const eventsByDay = results.reduce((acc, event) => {
      const date = event.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          appointments: [],
          stats: {
            total: event.appointments_per_day,
            revenue: event.revenue_per_day
          }
        };
      }
      acc[date].appointments.push({
        id: event.id,
        time: event.time,
        status: event.status,
        client_name: event.client_name,
        service_name: event.service_name,
        service_duration: event.service_duration,
        service_category: event.service_category,
        staff_name: event.staff_name
      });
      return acc;
    }, {});

    res.json(eventsByDay);
  });
});

// GET calendar filters and aggregations
app.get('/api/appointments/filters', (req, res) => {
  const { start_date, end_date } = req.query;
  
  const queries = {
    services: `
      SELECT DISTINCT s.id, s.name, COUNT(a.id) as appointment_count
      FROM services s
      LEFT JOIN appointments a ON s.id = a.service_id 
      AND a.date BETWEEN ? AND ?
      GROUP BY s.id, s.name
    `,
    staff: `
      SELECT DISTINCT u.id, u.name, COUNT(a.id) as appointment_count
      FROM users u
      LEFT JOIN appointments a ON u.id = a.staff_id 
      AND a.date BETWEEN ? AND ?
      WHERE u.role = 'staff'
      GROUP BY u.id, u.name
    `,
    statuses: `
      SELECT status, COUNT(*) as count
      FROM appointments
      WHERE date BETWEEN ? AND ?
      GROUP BY status
    `
  };

  Promise.all([
    new Promise((resolve, reject) => {
      db.query(queries.services, [start_date, end_date], (err, results) => {
        if (err) reject(err);
        resolve({ services: results });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(queries.staff, [start_date, end_date], (err, results) => {
        if (err) reject(err);
        resolve({ staff: results });
      });
    }),
    new Promise((resolve, reject) => {
      db.query(queries.statuses, [start_date, end_date], (err, results) => {
        if (err) reject(err);
        resolve({ statuses: results });
      });
    })
  ])
  .then(results => {
    const filters = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    res.json(filters);
  })
  .catch(error => {
    logger.error('Error fetching filters:', error);
    res.status(500).json({ error: error.message });
  });
});

// --- ENDPOINTS PARA REPORTES DINÁMICOS ---

// Obtener datos generales para reportes
app.get('/api/reports/overview', async (req, res) => {
  const { start_date, end_date } = req.query;
  const companyId = 1;

  try {
    // Query principal con todas las métricas
    const query = `
      SELECT 
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COUNT(CASE WHEN a.status = 'scheduled' THEN 1 END) as scheduled_appointments,
        COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_appointments,
        COALESCE(SUM(s.price), 0) as total_revenue,
        COALESCE(AVG(s.price), 0) as avg_service_price,
        COUNT(DISTINCT a.client_id) as unique_clients,
        COUNT(DISTINCT a.staff_id) as active_staff,
        COUNT(DISTINCT s.id) as services_used
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.company_id = ? 
      ${start_date && end_date ? 'AND a.date BETWEEN ? AND ?' : ''}
    `;

    const params = [companyId];
    if (start_date && end_date) {
      params.push(start_date, end_date);
    }

    const [results] = await db.promise().query(query, params);
    const overview = results[0];

    // Calcular métricas adicionales
    overview.cancellation_rate = overview.total_appointments > 0 
      ? ((overview.cancelled_appointments / overview.total_appointments) * 100).toFixed(2)
      : 0;
    
    overview.completion_rate = overview.total_appointments > 0 
      ? ((overview.completed_appointments / overview.total_appointments) * 100).toFixed(2)
      : 0;

    res.json(overview);
  } catch (error) {
    console.error('Error fetching reports overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener datos de ingresos por período
app.get('/api/reports/revenue', async (req, res) => {
  const { start_date, end_date, period = 'monthly' } = req.query;
  const companyId = 1;

  try {
    let dateFormat, groupBy;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        groupBy = 'DATE(a.date)';
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        groupBy = 'YEAR(a.date), WEEK(a.date)';
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        groupBy = 'YEAR(a.date), MONTH(a.date)';
        break;
      case 'yearly':
        dateFormat = '%Y';
        groupBy = 'YEAR(a.date)';
        break;
      default:
        dateFormat = '%Y-%m';
        groupBy = 'YEAR(a.date), MONTH(a.date)';
    }

    const query = `
      SELECT 
        DATE_FORMAT(a.date, '${dateFormat}') as period,
        DATE_FORMAT(a.date, '%Y-%m-%d') as date,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as revenue,
        COALESCE(AVG(s.price), 0) as avg_price
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.company_id = ? 
      ${start_date && end_date ? 'AND a.date BETWEEN ? AND ?' : ''}
      GROUP BY ${groupBy}
      ORDER BY a.date ASC
   
    `;

    const params = [companyId];
    if (start_date && end_date) {
      params.push(start_date, end_date);
    }

    const [results] = await db.promise().query(query, params);
    res.json(results);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener datos de servicios más populares
app.get('/api/reports/services', async (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;
  const companyId = 1;

  try {
    const query = `
      SELECT 
        s.id,
        s.name as service_name,
        sc.name as category_name,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as total_revenue,
        s.price,
        s.duration
      FROM services s
      LEFT JOIN appointments a ON s.id = a.service_id AND a.company_id = ?
        ${start_date && end_date ? 'AND a.date BETWEEN ? AND ?' : ''}
      LEFT JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.company_id = ?
      GROUP BY s.id, s.name, sc.name, s.price, s.duration
      ORDER BY total_appointments DESC
      LIMIT ?
    `;

    const params = [companyId];
    if (start_date && end_date) {
      params.push(start_date, end_date);
    }
    params.push(companyId, parseInt(limit));

    const [results] = await db.promise().query(query, params);
    res.json(results);
  } catch (error) {
    console.error('Error fetching services data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener datos de rendimiento del staff
app.get('/api/reports/staff', async (req, res) => {
  const { start_date, end_date } = req.query;
  const companyId = 1;

  try {
    const query = `
      SELECT 
        u.id,
        u.name as staff_name,
        u.email,
        u.role,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as total_revenue,
        COUNT(DISTINCT a.client_id) as unique_clients,
        GROUP_CONCAT(DISTINCT sp.name) as specialties
      FROM users u
      LEFT JOIN appointments a ON u.id = a.staff_id AND a.company_id = ?
        ${start_date && end_date ? 'AND a.date BETWEEN ? AND ?' : ''}
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN staff_specialties ss ON u.id = ss.staff_id
      LEFT JOIN specialties sp ON ss.specialty_id = sp.id
      WHERE u.company_id = ? AND u.role = 'staff'
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY total_appointments DESC
    `;

    const params = [companyId];
    if (start_date && end_date) {
      params.push(start_date, end_date);
    }
    params.push(companyId);

    const [results] = await db.promise().query(query, params);
    
    // Procesar especialidades
    const processedResults = results.map(staff => ({
      ...staff,
      specialties: staff.specialties ? staff.specialties.split(',') : [],
      completion_rate: staff.total_appointments > 0 
        ? ((staff.completed_appointments / staff.total_appointments) * 100).toFixed(2)
        : 0,
      cancellation_rate: staff.total_appointments > 0 
        ? ((staff.cancelled_appointments / staff.total_appointments) * 100).toFixed(2)
        : 0
    }));

    res.json(processedResults);
  } catch (error) {
    console.error('Error fetching staff data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener datos de clientes
app.get('/api/reports/clients', async (req, res) => {
  const { start_date, end_date, limit = 20 } = req.query;
  const companyId = 1;

  try {
    const query = `
      SELECT 
        u.id,
        u.name as client_name,
        u.email,
        u.phone,
        COUNT(a.id) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as total_spent,
        MAX(a.date) as last_appointment_date,
        MIN(a.date) as first_appointment_date
      FROM users u
      LEFT JOIN appointments a ON u.id = a.client_id AND a.company_id = ?
        ${start_date && end_date ? 'AND a.date BETWEEN ? AND ?' : ''}
      LEFT JOIN services s ON a.service_id = s.id
      WHERE u.company_id = ? AND u.role = 'client'
      GROUP BY u.id, u.name, u.email, u.phone
      HAVING total_appointments > 0
      ORDER BY total_spent DESC, total_appointments DESC
      LIMIT ?
    `;

    const params = [companyId];
    if (start_date && end_date) {
      params.push(start_date, end_date);
    }
    params.push(companyId, parseInt(limit));

    const [results] = await db.promise().query(query, params);
    res.json(results);  } catch (error) {
    console.error('Error fetching clients data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Nuevo endpoint para ventas mensuales
app.get('/api/reports/sales-by-month', async (req, res) => {
  const { start_date, end_date } = req.query;
  const companyId = 1;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  try {
    // Generar lista de meses entre start_date y end_date
    const monthsQuery = `
      WITH RECURSIVE months AS (
        SELECT DATE_FORMAT(STR_TO_DATE(?, '%Y-%m-%d'), '%Y-%m-01') AS month_start
        UNION ALL
        SELECT DATE_ADD(month_start, INTERVAL 1 MONTH)
        FROM months
        WHERE month_start < DATE_FORMAT(STR_TO_DATE(?, '%Y-%m-%d'), '%Y-%m-01')
      )
      SELECT 
        YEAR(month_start) as year,
        MONTHNAME(month_start) as month,
        MONTH(month_start) as month_number,
        month_start
      FROM months
    `;
    const [months] = await db.promise().query(monthsQuery, [start_date, end_date]);

    // Obtener ventas agrupadas por mes
    const salesQuery = `
      SELECT
        YEAR(a.date) as year,
        MONTHNAME(a.date) as month,
        MONTH(a.date) as month_number,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as total_revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.company_id = ?
        AND a.date BETWEEN ? AND ?
      GROUP BY YEAR(a.date), MONTH(a.date), MONTHNAME(a.date)
    `;
    const salesParams = [companyId, start_date, end_date];
    const [sales] = await db.promise().query(salesQuery, salesParams);

    // Unir meses y ventas, rellenando con 0 donde no haya ventas
    const salesMap = new Map();
    sales.forEach(row => {
      salesMap.set(`${row.year}-${row.month_number}`, row.total_revenue);
    });
    const results = months.map(m => ({
      year: m.year,
      month: m.month,
      month_number: m.month_number,
      total_revenue: salesMap.get(`${m.year}-${m.month_number}`) || 0
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching monthly sales data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gráfico de líneas: citas completadas vs canceladas por día
app.get('/api/reports/appointments-status-by-day', async (req, res) => {
  const { start_date, end_date, period = 'daily', channel, service } = req.query;
  const companyId = 1;
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }
  try {
    let filters = 'a.company_id = ? AND a.date BETWEEN ? AND ?';
    const params = [companyId, start_date, end_date];
    if (channel && channel !== 'all') {
      filters += ' AND a.channel = ?';
      params.push(channel);
    }
    if (service && service !== 'all') {
      filters += ' AND s.name = ?';
      params.push(service);
    }
    const query = `
      SELECT
        DATE(a.date) as date,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE ${filters}
      GROUP BY DATE(a.date)
      ORDER BY DATE(a.date)
    `;
    const [results] = await db.promise().query(query, params);
    res.json(results);
  } catch (error) {
    console.error('Error fetching appointments status by day:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gráfico radial: porcentaje de servicios completados vs cancelados
app.get('/api/reports/services-completion-ratio', async (req, res) => {
  const { start_date, end_date, channel, service } = req.query;
  const companyId = 1;
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }
  try {
    let filters = 'a.company_id = ? AND a.date BETWEEN ? AND ?';
    const params = [companyId, start_date, end_date];
    if (channel && channel !== 'all') {
      filters += ' AND a.channel = ?';
      params.push(channel);
    }
    if (service && service !== 'all') {
      filters += ' AND s.name = ?';
      params.push(service);
    }
    const query = `
      SELECT
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE ${filters}
    `;
    const [results] = await db.promise().query(query, params);
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching services completion ratio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gráfico de barras múltiples: ingresos por canal (ejemplo: online vs presencial)
app.get('/api/reports/revenue-by-channel', async (req, res) => {
  const { start_date, end_date, period = 'monthly', service } = req.query;
  const companyId = 1;
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }
  try {
    let filters = 'a.company_id = ? AND a.date BETWEEN ? AND ?';
    const params = [companyId, start_date, end_date];
    if (service && service !== 'all') {
      filters += ' AND s.name = ?';
      params.push(service);
    }
    
    // Check if channel column exists, if not, use a default value
    const query = `
      SELECT
        COALESCE(a.channel, 'presencial') as channel,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as total_revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE ${filters}
      GROUP BY COALESCE(a.channel, 'presencial')
    `;
    
    try {
      const [results] = await db.promise().query(query, params);
      res.json(results);
    } catch (queryError) {
      // If channel column doesn't exist yet, return mock data
      if (queryError.code === 'ER_BAD_FIELD_ERROR') {
        console.warn('Channel column not found, returning mock data');
        const mockData = [
          { channel: 'presencial', total_revenue: 150000 },
          { channel: 'online', total_revenue: 75000 }
        ];
        res.json(mockData);
      } else {
        throw queryError;
      }
    }
  } catch (error) {
    console.error('Error fetching revenue by channel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gráfico de barras con barra activa: top servicios por ingresos
app.get('/api/reports/top-services', async (req, res) => {
  const { start_date, end_date, channel } = req.query;
  const companyId = 1;
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }
  try {
    let filters = 'a.company_id = ? AND a.date BETWEEN ? AND ?';
    const params = [companyId, start_date, end_date];
    if (channel && channel !== 'all') {
      filters += ' AND a.channel = ?';
      params.push(channel);
    }
    const query = `
      SELECT
        s.name as service,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as total_revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE ${filters}
      GROUP BY s.name
      ORDER BY total_revenue DESC
      LIMIT 5
    `;
    const [results] = await db.promise().query(query, params);
    res.json(results);
  } catch (error) {
    console.error('Error fetching top services:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== BILLING ENDPOINTS =====

// GET subscription information
app.get('/api/billing/subscription', (req, res) => {
  const query = `    SELECT 
      s.id,
      s.plan_id,
      bp.name as plan_name,
      s.status,
      s.start_date,
      s.end_date,
      s.auto_renew,
      CASE WHEN s.trial_used = 0 THEN 1 ELSE 0 END as is_trial,
      DATEDIFF(s.end_date, NOW()) as remaining_days
    FROM subscriptions s
    LEFT JOIN billing_plans bp ON s.plan_id = bp.id
    WHERE s.company_id = 1 AND s.status IN ('active', 'inactive', 'suspended')
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      logger.error('Error fetching subscription:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.json(null);
    }
    
    res.json(results[0]);
  });
});

// GET available plans
app.get('/api/billing/plans', (req, res) => {  const query = `
    SELECT 
      id,
      name,
      description,
      price,
      billing_cycle,
      max_appointments,
      max_staff as max_users,
      max_clients,
      max_services,
      advanced_reports as has_advanced_reports,
      api_access as has_api_access,
      CASE WHEN support_level = 'premium' THEN 1 ELSE 0 END as has_priority_support,
      active as is_active,
      CASE 
        WHEN integrations_allowed IS NOT NULL AND integrations_allowed != '' 
        THEN integrations_allowed 
        ELSE '[]' 
      END as features
    FROM billing_plans
    WHERE active = 1
    ORDER BY price ASC
  `;
    db.query(query, (err, results) => {
    if (err) {
      logger.error('Error fetching plans:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Procesar los resultados para asegurar que features sea un JSON válido
    const processedResults = results.map(plan => {
      try {
        // Validar y procesar el campo features
        let features = '[]';
        if (plan.features && typeof plan.features === 'string') {
          try {
            const parsed = JSON.parse(plan.features);
            if (Array.isArray(parsed)) {
              // Filtrar solo strings válidos
              const validFeatures = parsed.filter(f => 
                f && typeof f === 'string' && f.trim() !== '' && !(/^\d+$/.test(f.trim()))
              );
              features = JSON.stringify(validFeatures);
            }
          } catch (parseErr) {
            console.warn('Invalid JSON in features field:', plan.features);
            features = '[]';
          }
        }
        
        return {
          ...plan,
          features: features,
          // Asegurar que los valores booleanos sean correctos
          has_advanced_reports: Boolean(plan.has_advanced_reports),
          has_api_access: Boolean(plan.has_api_access),
          has_priority_support: Boolean(plan.has_priority_support),
          is_active: Boolean(plan.is_active)
        };
      } catch (error) {
        console.error('Error processing plan:', error);
        return {
          ...plan,
          features: '[]'
        };
      }
    });
    
    res.json(processedResults);
  });
});

// GET invoices
app.get('/api/billing/invoices', (req, res) => {
  const query = `
    SELECT 
      id,
      total_amount as amount,
      status,
      due_date,
      paid_at as paid_date,
      notes as description,
      invoice_number
    FROM invoices
    WHERE company_id = 1
    ORDER BY created_at DESC
    LIMIT 50
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      logger.error('Error fetching invoices:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// GET payment notifications
app.get('/api/billing/payment-notifications', (req, res) => {
  // Primero intentamos acceder a la tabla, si no existe devolvemos datos mock
  const query = `
    SELECT 
      id,
      type,
      title,
      message,
      status as is_read,
      priority,
      created_at
    FROM payment_notifications
    WHERE company_id = 1
    ORDER BY created_at DESC
    LIMIT 20
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      // Si la tabla no existe, devolver datos mock
      if (err.code === 'ER_NO_SUCH_TABLE') {
        logger.warn('payment_notifications table does not exist, returning mock data');
        const mockNotifications = [
          {
            id: 1,
            type: 'payment_due',
            title: 'Pago próximo',
            message: 'Tu suscripción se renovará en 3 días por $49.990',
            is_read: false,
            priority: 'medium',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            type: 'renewal_success',
            title: 'Renovación exitosa',
            message: 'Tu plan se ha renovado correctamente',
            is_read: true,
            priority: 'low',
            created_at: new Date(Date.now() - 86400000).toISOString() // Ayer
          }
        ];
        return res.json(mockNotifications);
      }
      
      logger.error('Error fetching payment notifications:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// POST activate plan with code
app.post('/api/billing/activate-plan', (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Código de activación requerido' });
  }
  
  // First, validate the activation code
  const validateCodeQuery = `
    SELECT ac.*, bp.name as plan_name, bp.price, bp.billing_cycle
    FROM activation_codes ac
    LEFT JOIN billing_plans bp ON ac.plan_id = bp.id
    WHERE ac.code = ? AND ac.status = 'active' AND ac.expires_at > NOW()
  `;
  
  db.query(validateCodeQuery, [code], (err, codeResults) => {
    if (err) {
      // Si la tabla no existe, simular validación con códigos mock
      if (err.code === 'ER_NO_SUCH_TABLE') {
        logger.warn('activation_codes table does not exist, using mock validation');
        
        // Códigos mock para testing
        const mockCodes = {
          'BASIC-2025-ABC123': { plan_id: 1, plan_name: 'Plan Básico', duration_months: 1 },
          'PRO-2025-DEF456': { plan_id: 2, plan_name: 'Plan Profesional', duration_months: 3 }
        };
        
        if (!mockCodes[code]) {
          return res.status(400).json({ error: 'Código inválido o expirado' });
        }
        
        const mockCode = mockCodes[code];
        
        // Crear/actualizar suscripción directamente
        const subscriptionQuery = `
          INSERT INTO subscriptions (
            company_id, plan_id, start_date, end_date, 
            status, auto_renew, created_by
          ) VALUES (
            1, ?, NOW(), 
            DATE_ADD(NOW(), INTERVAL ? MONTH),
            'active', 1, 1
          )
          ON DUPLICATE KEY UPDATE
            plan_id = VALUES(plan_id),
            status = 'active',
            end_date = DATE_ADD(NOW(), INTERVAL ? MONTH),
            updated_at = NOW()
        `;
        
        db.query(subscriptionQuery, [mockCode.plan_id, mockCode.duration_months, mockCode.duration_months], (err, result) => {
          if (err) {
            logger.error('Error creating subscription:', err);
            return res.status(500).json({ error: 'Error al activar el plan' });
          }
          
          res.json({ 
            success: true, 
            message: `Plan ${mockCode.plan_name} activado exitosamente` 
          });
        });
        return;
      }
      
      logger.error('Error validating activation code:', err);
      return res.status(500).json({ error: 'Error al validar el código' });
    }
    
    if (codeResults.length === 0) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }
    
    const activationCode = codeResults[0];
    
    // Create or update subscription
    const subscriptionQuery = `
      INSERT INTO subscriptions (
        company_id, plan_id, start_date, end_date, 
        status, auto_renew, created_by
      ) VALUES (
        1, ?, NOW(), 
        DATE_ADD(NOW(), INTERVAL ? MONTH),
        'active', 1, 1
      )
      ON DUPLICATE KEY UPDATE
        plan_id = VALUES(plan_id),
        status = 'active',
        end_date = DATE_ADD(NOW(), INTERVAL ? MONTH),
        updated_at = NOW()
    `;
    
    const months = activationCode.duration_months || 1;
    
    db.query(subscriptionQuery, [activationCode.plan_id, months, months], (err, result) => {
      if (err) {
        logger.error('Error creating subscription:', err);
        return res.status(500).json({ error: 'Error al activar el plan' });
      }
      
      // Mark activation code as used
      const markUsedQuery = 'UPDATE activation_codes SET status = "used", used_by = 1, used_at = NOW(), company_id = 1 WHERE id = ?';
      db.query(markUsedQuery, [activationCode.id], (err) => {
        if (err) {
          logger.warn('Error marking activation code as used:', err);
        }
      });
      
      res.json({ 
        success: true, 
        message: `Plan ${activationCode.plan_name} activado exitosamente` 
      });
    });
  });
});

// POST change plan
app.post('/api/billing/change-plan', (req, res) => {
  const { new_plan_id, activation_code } = req.body;
  
  if (!new_plan_id) {
    return res.status(400).json({ 
      error: 'ID del nuevo plan requerido',
      success: false 
    });
  }

  // First, validate that the new plan exists and is active
  const validatePlanQuery = `
    SELECT id, name, price, billing_cycle, active 
    FROM billing_plans 
    WHERE id = ? AND active = 1
  `;
  
  db.query(validatePlanQuery, [new_plan_id], (err, planResults) => {
    if (err) {
      logger.error('Error validating plan:', err);
      return res.status(500).json({ 
        error: 'Error al validar el plan',
        success: false 
      });
    }
    
    if (planResults.length === 0) {
      return res.status(400).json({ 
        error: 'El plan seleccionado no existe o no está disponible',
        success: false 
      });
    }
    
    const selectedPlan = planResults[0];
    
    // Check if user already has this plan
    const checkCurrentPlanQuery = `
      SELECT plan_id, bp.name as current_plan_name
      FROM subscriptions s
      LEFT JOIN billing_plans bp ON s.plan_id = bp.id
      WHERE s.company_id = 1 AND s.status IN ('active', 'inactive')
      ORDER BY s.created_at DESC
      LIMIT 1
    `;
    
    db.query(checkCurrentPlanQuery, (err, currentResults) => {
      if (err) {
        logger.error('Error checking current plan:', err);
        return res.status(500).json({ 
          error: 'Error al verificar el plan actual',
          success: false 
        });
      }
      
      if (currentResults.length > 0 && currentResults[0].plan_id === new_plan_id) {
        return res.status(400).json({ 
          error: 'Ya tienes este plan activo',
          success: false 
        });
      }
      
      // If activation code is provided, validate it
      if (activation_code && activation_code.trim()) {
        const validateCodeQuery = `
          SELECT ac.*, bp.name as plan_name 
          FROM activation_codes ac
          LEFT JOIN billing_plans bp ON ac.plan_id = bp.id
          WHERE ac.code = ? AND ac.status = 'active' AND ac.expires_at > NOW()
        `;
        
        db.query(validateCodeQuery, [activation_code.trim()], (err, codeResults) => {
          if (err) {
            // If activation_codes table doesn't exist, use mock validation
            if (err.code === 'ER_NO_SUCH_TABLE') {
              logger.warn('activation_codes table does not exist, using mock validation');
              
              const mockCodes = {
                'BASIC-2025-ABC123': { plan_id: 1 },
                'PRO-2025-DEF456': { plan_id: 2 },
                'ENTERPRISE-789': { plan_id: 3 }
              };
              
              if (!mockCodes[activation_code.trim()]) {
                return res.status(400).json({ 
                  error: 'Código de activación inválido o expirado',
                  success: false 
                });
              }
              
              // Proceed with plan change using mock validation
              updateSubscriptionPlan(new_plan_id, res, activation_code.trim(), selectedPlan);
              return;
            }
            
            logger.error('Error validating activation code:', err);
            return res.status(500).json({ 
              error: 'Error al validar el código de activación',
              success: false 
            });
          }
          
          if (codeResults.length === 0) {
            return res.status(400).json({ 
              error: 'Código de activación inválido o expirado',
              success: false 
            });
          }
          
          // Optionally check if code is for the specific plan
          const codeForPlan = codeResults[0];
          if (codeForPlan.plan_id && codeForPlan.plan_id !== new_plan_id) {
            return res.status(400).json({ 
              error: `Este código es solo para el plan: ${codeForPlan.plan_name}`,
              success: false 
            });
          }
          
          updateSubscriptionPlan(new_plan_id, res, activation_code.trim(), selectedPlan);
        });
      } else {
        updateSubscriptionPlan(new_plan_id, res, null, selectedPlan);
      }
    });
  });
});

function updateSubscriptionPlan(planId, res, activationCode = null, planInfo = null) {
  // Get current subscription info for logging
  const getCurrentSubQuery = `
    SELECT s.*, bp.name as old_plan_name 
    FROM subscriptions s
    LEFT JOIN billing_plans bp ON s.plan_id = bp.id
    WHERE s.company_id = 1 AND s.status IN ('active', 'inactive')
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  
  db.query(getCurrentSubQuery, (err, currentSub) => {
    if (err) {
      logger.error('Error getting current subscription:', err);
      return res.status(500).json({ 
        error: 'Error al obtener la suscripción actual',
        success: false 
      });
    }
    
    const updateQuery = `
      UPDATE subscriptions 
      SET plan_id = ?, updated_at = NOW()
      WHERE company_id = 1 AND status IN ('active', 'inactive')
    `;
    
    db.query(updateQuery, [planId], (err, result) => {
      if (err) {
        logger.error('Error updating subscription plan:', err);
        return res.status(500).json({ 
          error: 'Error al cambiar el plan',
          success: false 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(400).json({ 
          error: 'No se encontró suscripción activa para actualizar',
          success: false 
        });
      }
      
      // Mark activation code as used if provided
      if (activationCode) {
        const markUsedQuery = 'UPDATE activation_codes SET status = "used", used_at = NOW(), used_by = 1, company_id = 1 WHERE code = ?';
        db.query(markUsedQuery, [activationCode], (err) => {
          if (err) {
            logger.warn('Error marking activation code as used:', err);
          }
        });
      }
      
      // Log the successful plan change
      const logData = {
        company_id: 1,
        old_plan: currentSub[0]?.old_plan_name || 'Unknown',
        new_plan: planInfo?.name || 'Unknown',
        activation_code_used: !!activationCode,
        changed_at: new Date().toISOString()
      };
      
      logger.info('Plan changed successfully:', logData);
      
      res.json({ 
        success: true, 
        message: `Plan cambiado exitosamente a ${planInfo?.name || 'nuevo plan'}`,
        data: {
          new_plan_id: planId,
          new_plan_name: planInfo?.name,
          activation_code_used: !!activationCode,
          updated_at: new Date().toISOString()
        }
      });
    });
  });
}

// POST suspend subscription
app.post('/api/billing/suspend-subscription', (req, res) => {
  const query = `
    UPDATE subscriptions 
    SET status = 'suspended', updated_at = NOW()
    WHERE company_id = 1 AND status = 'active'
  `;
  
  db.query(query, (err, result) => {
    if (err) {
      logger.error('Error suspending subscription:', err);
      return res.status(500).json({ error: 'Error al suspender la suscripción' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'No se encontró suscripción activa' });
    }
    
    res.json({ success: true, message: 'Suscripción suspendida exitosamente' });
  });
});

// POST reactivate subscription
app.post('/api/billing/reactivate-subscription', (req, res) => {
  const query = `
    UPDATE subscriptions 
    SET status = 'active', updated_at = NOW()
    WHERE company_id = 1 AND status = 'suspended'
  `;
  
  db.query(query, (err, result) => {
    if (err) {
      logger.error('Error reactivating subscription:', err);
      return res.status(500).json({ error: 'Error al reactivar la suscripción' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'No se encontró suscripción suspendida' });
    }
    
    res.json({ success: true, message: 'Suscripción reactivada exitosamente' });
  });
});

// GET download invoice
app.get('/api/billing/download-invoice/:id', (req, res) => {
  const { id } = req.params;
  
  const query = 'SELECT * FROM invoices WHERE id = ? AND company_id = 1';
  
  db.query(query, [id], (err, results) => {
    if (err) {
      logger.error('Error fetching invoice:', err);
      return res.status(500).json({ error: 'Error al obtener la factura' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    // In a real implementation, you would generate and return a PDF
    // For now, return the invoice data as JSON
    res.json({ 
      message: 'Funcionalidad de descarga en desarrollo',
      invoice: results[0]
    });
  });
});

// GET plan usage
app.get('/api/billing/plan-usage', (req, res) => {
  logger.info('Fetching plan usage data');

  // First, get the current subscription and plan
  const subscriptionQuery = `
    SELECT s.*, p.name as plan_name, p.features 
    FROM subscriptions s 
    JOIN plans p ON s.plan_id = p.id 
    WHERE s.company_id = 1 AND s.status = 'active'
    ORDER BY s.created_at DESC 
    LIMIT 1
  `;

  db.query(subscriptionQuery, (err, subscriptionResults) => {
    if (err) {
      logger.error('Error fetching subscription:', err);
      // Return mock data if subscription doesn't exist
      return res.json({
        planName: 'Plan Básico',
        planFeatures: {
          max_appointments: 100,
          max_clients: 50,
          max_staff: 5,
          storage_gb: 1
        },
        currentUsage: {
          appointments: 75,
          clients: 32,
          staff: 3,
          storage_used: 0.4
        },
        usagePercentages: {
          appointments: 75,
          clients: 64,
          staff: 60,
          storage: 40
        },
        alerts: [
          {
            type: 'warning',
            resource: 'appointments',
            message: 'Te quedan solo 25 citas disponibles este mes',
            severity: 'medium'
          }
        ],
        recommendations: [
          {
            type: 'upgrade',
            message: 'Considera actualizar al Plan Professional para obtener más citas y clientes',
            suggestedPlan: 'Plan Professional',
            benefits: ['300 citas mensuales', '150 clientes', '10 miembros del staff']
          }
        ]
      });
    }

    if (subscriptionResults.length === 0) {
      // Return mock data for demo purposes
      return res.json({
        planName: 'Plan Básico',
        planFeatures: {
          max_appointments: 100,
          max_clients: 50,
          max_staff: 5,
          storage_gb: 1
        },
        currentUsage: {
          appointments: 75,
          clients: 32,
          staff: 3,
          storage_used: 0.4
        },
        usagePercentages: {
          appointments: 75,
          clients: 64,
          staff: 60,
          storage: 40
        },
        alerts: [
          {
            type: 'warning',
            resource: 'appointments',
            message: 'Te quedan solo 25 citas disponibles este mes',
            severity: 'medium'
          }
        ],
        recommendations: [
          {
            type: 'upgrade',
            message: 'Considera actualizar al Plan Professional para obtener más citas y clientes',
            suggestedPlan: 'Plan Professional',
            benefits: ['300 citas mensuales', '150 clientes', '10 miembros del staff']
          }
        ]
      });
    }

    const subscription = subscriptionResults[0];
    let planFeatures;

    try {
      planFeatures = typeof subscription.features === 'string' 
        ? JSON.parse(subscription.features) 
        : subscription.features;
    } catch (parseErr) {
      logger.error('Error parsing plan features:', parseErr);
      planFeatures = {
        max_appointments: 100,
        max_clients: 50,
        max_staff: 5,
        storage_gb: 1
      };
    }

    // Get current usage from different tables
    const usageQueries = [
      // Count appointments this month
      `SELECT COUNT(*) as count FROM appointments 
       WHERE company_id = 1 AND MONTH(appointment_date) = MONTH(CURRENT_DATE()) 
       AND YEAR(appointment_date) = YEAR(CURRENT_DATE())`,
      
      // Count total clients
      `SELECT COUNT(*) as count FROM clients WHERE company_id = 1`,
      
      // Count active staff
      `SELECT COUNT(*) as count FROM users WHERE company_id = 1 AND status = 'active'`,
      
      // Calculate storage usage (mock for now)
      `SELECT 0.4 as storage_used`
    ];

    Promise.all(
      usageQueries.map(query => 
        new Promise((resolve, reject) => {
          db.query(query, (err, results) => {
            if (err) {
              logger.warn(`Usage query failed: ${query}`, err);
              resolve([{ count: 0, storage_used: 0 }]);
            } else {
              resolve(results);
            }
          });
        })
      )
    ).then(([appointmentResults, clientResults, staffResults, storageResults]) => {
      const currentUsage = {
        appointments: appointmentResults[0]?.count || 0,
        clients: clientResults[0]?.count || 0,
        staff: staffResults[0]?.count || 0,
        storage_used: storageResults[0]?.storage_used || 0
      };

      // Calculate usage percentages
      const usagePercentages = {
        appointments: Math.round((currentUsage.appointments / planFeatures.max_appointments) * 100),
        clients: Math.round((currentUsage.clients / planFeatures.max_clients) * 100),
        staff: Math.round((currentUsage.staff / planFeatures.max_staff) * 100),
        storage: Math.round((currentUsage.storage_used / planFeatures.storage_gb) * 100)
      };

      // Generate alerts based on usage
      const alerts = [];
      
      if (usagePercentages.appointments >= 80) {
        const remaining = planFeatures.max_appointments - currentUsage.appointments;
        alerts.push({
          type: 'warning',
          resource: 'appointments',
          message: `Te quedan solo ${remaining} citas disponibles este mes`,
          severity: remaining <= 10 ? 'high' : 'medium'
        });
      }

      if (usagePercentages.clients >= 90) {
        const remaining = planFeatures.max_clients - currentUsage.clients;
        alerts.push({
          type: 'error',
          resource: 'clients',
          message: `Límite de clientes casi alcanzado. Solo puedes agregar ${remaining} clientes más`,
          severity: 'high'
        });
      }

      if (usagePercentages.staff >= 100) {
        alerts.push({
          type: 'error',
          resource: 'staff',
          message: 'Has alcanzado el límite de miembros del staff para tu plan',
          severity: 'high'
        });
      }

      if (usagePercentages.storage >= 85) {
        alerts.push({
          type: 'warning',
          resource: 'storage',
          message: 'Tu almacenamiento está casi lleno',
          severity: 'medium'
        });
      }

      // Generate recommendations
      const recommendations = [];
      
      const highUsageResources = Object.entries(usagePercentages)
        .filter(([_, percentage]) => percentage >= 75)
        .map(([resource]) => resource);

      if (highUsageResources.length >= 2) {
        recommendations.push({
          type: 'upgrade',
          message: 'Considera actualizar tu plan para obtener más recursos',
          suggestedPlan: subscription.plan_name === 'Plan Básico' ? 'Plan Professional' : 'Plan Enterprise',
          benefits: subscription.plan_name === 'Plan Básico' 
            ? ['300 citas mensuales', '150 clientes', '10 miembros del staff', '5GB de almacenamiento']
            : ['Citas ilimitadas', '500 clientes', '25 miembros del staff', '20GB de almacenamiento']
        });
      }

      if (usagePercentages.appointments >= 90) {
        recommendations.push({
          type: 'optimize',
          message: 'Optimiza tu gestión de citas para aprovechar mejor tu plan actual',
          suggestions: [
            'Configura recordatorios automáticos',
            'Utiliza citas recurrentes',
            'Gestiona las cancelaciones eficientemente'
          ]
        });
      }

      res.json({
        planName: subscription.plan_name,
        planFeatures,
        currentUsage,
        usagePercentages,
        alerts,
        recommendations
      });

    }).catch(err => {
      logger.error('Error calculating usage:', err);
      res.status(500).json({ error: 'Error al calcular el uso del plan' });
    });
  });
});

// GET appointments stats for dashboard
app.get('/api/appointments/stats', (req, res) => {
  const { start_date, end_date } = req.query;
  const companyId = 1; // Default company ID

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  logger.info('GET /api/appointments/stats - Request received', {
    query: req.query,
    companyId
  });

  try {    const query = `
      SELECT 
        DATE(a.date) as date,
        COUNT(*) as total_appointments,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN a.status IN ('scheduled', 'confirmed', 'pending') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END), 0) as total_revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.company_id = ? 
        AND a.date BETWEEN ? AND ?
      GROUP BY DATE(a.date)
      ORDER BY DATE(a.date)
    `;

    db.execute(query, [companyId, start_date, end_date], (err, results) => {
      if (err) {
        logger.error('Error fetching appointment stats:', err);
        res.status(500).json({ error: 'Error fetching appointment stats' });
        return;
      }

      logger.info('Appointment stats fetched successfully', {
        resultsCount: results.length
      });

      res.json(results);
    });
  } catch (error) {
    logger.error('Error in appointments stats endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info('Server startup', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
  console.log(`Server is running on port ${PORT}.`);
});
