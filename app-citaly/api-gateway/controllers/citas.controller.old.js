const db = require('../config/database');
const logger = require('../logger');

// Función para obtener socketManager y webhookManager
const getManagers = (req) => {
  const socketManager = req.app.get('socketManager');
  const webhookManager = req.app.get('webhookManager');
  return { socketManager, webhookManager };
};

// GET todas las citas
const getCitas = async (req, res) => {
  try {
    const { empresa_id } = req.params;
    const { fecha, fecha_inicio, fecha_fin, estado, sucursal_id, page = 1, limit = 10 } = req.query;

    logger.info('GET /api/appointments - Request received', {
      origen: req.get('origin'),
      empresa_id,
      fecha,
      fecha_inicio,
      fecha_fin,
      estado,
      sucursal_id
    });

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE c.empresa_id = ?';
    const queryParams = [empresa_id];

    if (fecha) {
      whereClause += ' AND c.fecha = ?';
      queryParams.push(fecha);
    } else if (fecha_inicio && fecha_fin) {
      whereClause += ' AND c.fecha BETWEEN ? AND ?';
      queryParams.push(fecha_inicio, fecha_fin);
    }

    if (estado) {
      whereClause += ' AND c.estado = ?';
      queryParams.push(estado);
    }

    if (sucursal_id) {
      whereClause += ' AND c.sucursal_id = ?';
      queryParams.push(sucursal_id);
    }

    const query = `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        c.notas,
        c.canal,
        c.origen,
        c.cliente_id,
        c.personal_id,
        c.servicio_id,
        c.sucursal_id,
        cl.nombres as cliente_nombres,
        cl.apellidos as cliente_apellidos,
        cl.telefono as cliente_telefono,
        cl.correo_electronico as cliente_email,
        CONCAT(cl.nombres, ' ', cl.apellidos) as cliente_nombre_completo,
        s.nombre as servicio_nombre,
        s.duracion as servicio_duracion,
        s.precio as servicio_precio_base,
        ss.precio as servicio_precio,
        cs.nombre as categoria_nombre,
        p.id as personal_id,
        u.nombre as personal_nombre,
        u.telefono as personal_telefono,
        suc.nombre as sucursal_nombre,
        suc.direccion as sucursal_direccion
      FROM citas c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN servicios s ON c.servicio_id = s.id
      LEFT JOIN servicios_sucursal ss ON c.servicio_id = ss.servicio_id AND c.sucursal_id = ss.sucursal_id
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      LEFT JOIN personal p ON c.personal_id = p.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN sucursales suc ON c.sucursal_id = suc.id
      ${whereClause}
      ORDER BY c.fecha ASC, c.hora ASC
      LIMIT ? OFFSET ?
    `;

    const [results] = await db.execute(query, [...queryParams, parseInt(limit), offset]);

    // Obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM citas c
      ${whereClause}
    `;
    const [totalResults] = await db.execute(countQuery, queryParams);

    // Formatear los resultados
    const formattedResults = results.map(cita => ({
      id: cita.id,
      fecha: cita.fecha,
      hora: cita.hora,
      estado: cita.estado,
      notas: cita.notas,
      canal: cita.canal,
      origen: cita.origen,
      cliente: {
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
  } catch (error) {
    logger.error('Error in getCitas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST crear nueva cita
const createCita = async (req, res) => {
  try {
    const { client_id, service_id, staff_id, date, time } = req.body;

    const query = `
      INSERT INTO appointments (company_id, client_id, service_id, staff_id, date, time, status)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
    `;

    db.query(query, [req.companyId, client_id, service_id, staff_id, date, time], async (err, results) => {
      if (err) {
        logger.error('Error creating appointment:', err);
        return res.status(500).json({ error: err.message });
      }

      const newAppointment = {
        id: results.insertId,
        ...req.body,
        status: 'scheduled',
        company_id: req.companyId
      };

      // Enviar notificaciones en tiempo real y webhooks
      const { socketManager, webhookManager } = getManagers(req);

      if (socketManager) {
        socketManager.notifyNewAppointment(newAppointment);
      }

      if (webhookManager) {
        webhookManager.appointmentCreated(newAppointment).catch(err =>
          logger.warn('Error enviando webhook de nueva cita:', err.message)
        );
      }

      res.status(201).json(newAppointment);
    });
  } catch (error) {
    logger.error('Error in createCita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT actualizar cita
const updateCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const query = 'UPDATE appointments SET status = ? WHERE id = ? AND company_id = ?';

    db.query(query, [status, id, req.companyId], (err, results) => {
      if (err) {
        logger.error('Error updating appointment:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }

      res.json({ message: 'Cita actualizada correctamente' });
    });
  } catch (error) {
    logger.error('Error in updateCita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE eliminar cita
const deleteCita = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM appointments WHERE id = ? AND company_id = ?';

    db.query(query, [id, req.companyId], (err, results) => {
      if (err) {
        logger.error('Error deleting appointment:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }

      res.status(204).send();
    });
  } catch (error) {
    logger.error('Error in deleteCita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET eventos de calendario
const getCalendarEvents = async (req, res) => {
  try {
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
      WHERE a.company_id = ?
      AND a.date BETWEEN ? AND ?
      ORDER BY a.date ASC, a.time ASC
    `;

    db.query(query, [req.companyId, startDate, endDate], (err, results) => {
      if (err) {
        logger.error('Error fetching calendar events:', err);
        return res.status(500).json({ error: err.message });
      }

      res.json(results);
    });
  } catch (error) {
    logger.error('Error in getCalendarEvents:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET filtros para el calendario
const getCalendarFilters = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const queries = {
      services: `
        SELECT DISTINCT s.id, s.name, COUNT(a.id) as appointment_count
        FROM services s
        LEFT JOIN appointments a ON s.id = a.service_id
        AND a.date BETWEEN ? AND ?
        WHERE s.company_id = ?
        GROUP BY s.id, s.name
      `,
      staff: `
        SELECT DISTINCT u.id, u.name, COUNT(a.id) as appointment_count
        FROM users u
        LEFT JOIN appointments a ON u.id = a.staff_id
        AND a.date BETWEEN ? AND ?
        WHERE u.role = 'staff' AND u.company_id = ?
        GROUP BY u.id, u.name
      `,
      statuses: `
        SELECT status, COUNT(*) as count
        FROM appointments
        WHERE date BETWEEN ? AND ? AND company_id = ?
        GROUP BY status
      `
    };

    Promise.all([
      new Promise((resolve, reject) => {
        db.query(queries.services, [start_date, end_date, req.companyId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(queries.staff, [start_date, end_date, req.companyId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(queries.statuses, [start_date, end_date, req.companyId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      })
    ])
    .then(results => {
      res.json({
        services: results[0],
        staff: results[1],
        statuses: results[2]
      });
    })
    .catch(error => {
      logger.error('Error fetching calendar filters:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    });
  } catch (error) {
    logger.error('Error in getCalendarFilters:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET lista de citas (formato simplificado)
const getAppointmentsList = async (req, res) => {
  try {
    // Por ahora retornamos array vacío, se puede implementar lógica específica
    res.json([]);
  } catch (error) {
    logger.error('Error fetching appointments list:', error);
    res.status(500).json({ error: 'Error al obtener lista de citas' });
  }
};

// GET citas para calendario
const getAppointmentsCalendar = async (req, res) => {
  try {
    const { start, end, company_id = 1 } = req.query;

    let whereClause = 'WHERE a.company_id = ?';
    const queryParams = [company_id];

    if (start && end) {
      whereClause += ' AND a.date BETWEEN ? AND ?';
      queryParams.push(start, end);
    }

    const query = `
      SELECT
        a.id,
        a.date,
        a.time,
        a.status,
        CONCAT(c.first_name, ' ', c.last_name) as title,
        c.phone,
        s.name as service_name,
        s.duration,
        s.price,
        u.name as staff_name,
        CONCAT(a.date, 'T', a.time) as start,
        DATE_ADD(CONCAT(a.date, 'T', a.time), INTERVAL s.duration MINUTE) as end
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN users u ON a.staff_id = u.id AND u.role = 'staff'
      ${whereClause}
      ORDER BY a.date ASC, a.time ASC
    `;

    const [results] = await db.promise().execute(query, queryParams);

    // Formatear para calendar
    const events = results.map(appointment => ({
      id: appointment.id,
      title: `${appointment.title} - ${appointment.service_name}`,
      start: appointment.start,
      end: appointment.end,
      backgroundColor: getStatusColor(appointment.status),
      borderColor: getStatusColor(appointment.status),
      textColor: '#fff',
      extendedProps: {
        status: appointment.status,
        client_phone: appointment.phone,
        service: appointment.service_name,
        staff: appointment.staff_name,
        duration: appointment.duration,
        price: appointment.price
      }
    }));

    res.json(events);

  } catch (error) {
    logger.error('Error fetching appointments calendar:', error);
    res.status(500).json({ error: 'Error al obtener calendario de citas' });
  }
};

// GET filtros para citas
const getAppointmentsFilters = async (req, res) => {
  try {
    const { company_id = 1 } = req.query;

    // Obtener servicios activos
    const servicesQuery = `
      SELECT id, name
      FROM services
      WHERE company_id = ? AND active = 1
      ORDER BY name
    `;
    const [services] = await db.promise().execute(servicesQuery, [company_id]);

    // Obtener personal activo
    const staffQuery = `
      SELECT id, name
      FROM users
      WHERE company_id = ? AND role = 'staff' AND active = 1
      ORDER BY name
    `;
    const [staff] = await db.promise().execute(staffQuery, [company_id]);

    // Obtener estados únicos de citas
    const statusQuery = `
      SELECT DISTINCT status
      FROM appointments
      WHERE company_id = ?
      ORDER BY status
    `;
    const [statuses] = await db.promise().execute(statusQuery, [company_id]);

    res.json({
      services,
      staff,
      statuses: statuses.map(s => s.status),
      predefinedStatuses: [
        { value: 'scheduled', label: 'Programada' },
        { value: 'confirmed', label: 'Confirmada' },
        { value: 'in_progress', label: 'En Progreso' },
        { value: 'completed', label: 'Completada' },
        { value: 'cancelled', label: 'Cancelada' },
        { value: 'no_show', label: 'No Asistió' }
      ]
    });

  } catch (error) {
    logger.error('Error fetching appointments filters:', error);
    res.status(500).json({ error: 'Error al obtener filtros de citas' });
  }
};

// Función auxiliar para obtener colores por estado
const getStatusColor = (status) => {
  const colors = {
    'scheduled': '#3b82f6',    // blue
    'confirmed': '#10b981',    // green
    'in_progress': '#f59e0b',  // yellow
    'completed': '#22c55e',    // green
    'cancelled': '#ef4444',    // red
    'no_show': '#6b7280'       // gray
  };
  return colors[status] || '#6b7280';
};

module.exports = {
  getCitas,
  createCita,
  updateCita,
  deleteCita,
  getAppointmentsList,
  getAppointmentsCalendar,
  getAppointmentsFilters
};
