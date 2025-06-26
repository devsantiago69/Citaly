const { db } = require('../config/db');
const logger = require('../logger');

// GET clientes
const getClientes = async (req, res) => {
  try {
    logger.info('GET /api/clients - Request received', { query: req.query });

    const {
      searchTerm,
      status,
      city,
      country,
      hasAppointments,
      startDate,
      endDate,
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
    const queryParams = [req.companyId];

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
  } catch (error) {
    logger.error('Error in getClientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST crear cliente
const createCliente = async (req, res) => {
  try {
    logger.info('POST /api/clients - Request received', { body: req.body });

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
        ?,
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
      req.companyId,
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
        SELECT * FROM clients WHERE id = ? AND company_id = ?
      `;

      db.query(getNewClientQuery, [results.insertId, req.companyId], (err, newClient) => {
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
  } catch (error) {
    logger.error('Error in createCliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT actualizar cliente
const updateCliente = async (req, res) => {
  try {
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
      WHERE id = ? AND company_id = ?
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
      status || 'active',
      id,
      req.companyId
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
  } catch (error) {
    logger.error('Error in updateCliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE eliminar cliente
const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`DELETE /api/clients/${id} - Request received`);

    // Primero verificamos si el cliente tiene citas
    const checkAppointmentsQuery = `
      SELECT COUNT(*) as appointmentCount
      FROM appointments
      WHERE client_id = ? AND company_id = ?
    `;

    db.query(checkAppointmentsQuery, [id, req.companyId], (err, results) => {
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
      const deleteQuery = 'DELETE FROM clients WHERE id = ? AND company_id = ?';

      db.query(deleteQuery, [id, req.companyId], (err, results) => {
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
  } catch (error) {
    logger.error('Error in deleteCliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET staff
const getStaff = async (req, res) => {
  try {
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
      WHERE u.role = 'staff' AND u.company_id = ?
    `;

    db.query(query, [req.companyId], (err, results) => {
      if (err) {
        logger.error('Error fetching staff:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  } catch (error) {
    logger.error('Error in getStaff:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST crear staff
const createStaff = async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;

    const query = `
      INSERT INTO users (company_id, name, email, phone, role, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `;

    db.query(query, [req.companyId, name, email, phone, role], (err, results) => {
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
  } catch (error) {
    logger.error('Error in createStaff:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET administradores
const getAdmins = async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        name,
        email,
        role,
        created_at as createdAt,
        '' as lastLogin
      FROM users
      WHERE role = 'admin' AND company_id = ?
    `;

    db.query(query, [req.companyId], (err, results) => {
      if (err) {
        logger.error('Error fetching admins:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  } catch (error) {
    logger.error('Error in getAdmins:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  getStaff,
  createStaff,
  getAdmins
};
