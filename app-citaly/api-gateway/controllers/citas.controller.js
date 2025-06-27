const db = require('../config/db');
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
    const { company_id } = req.user;
    const {
      fecha,
      fecha_inicio,
      fecha_fin,
      estado,
      sucursal_id,
      page = 1,
      limit = 10,
      status, // Agregamos parámetro status que viene del frontend
      date    // Agregamos parámetro date que viene del frontend
    } = req.query;

    logger.info('GET /api/appointments - Request received', {
      origen: req.get('origin'),
      company_id,
      fecha,
      fecha_inicio,
      fecha_fin,
      estado,
      sucursal_id,
      status,
      date
    });

    const offset = (page - 1) * parseInt(limit);

    let whereClause = 'WHERE c.empresa_id = ?';
    const queryParams = [company_id];

    // Manejamos el parámetro date (fecha) del frontend
    if (date) {
      whereClause += ' AND c.fecha = ?';
      queryParams.push(date);
    }
    // Si no hay date, usamos los parámetros tradicionales
    else if (fecha) {
      whereClause += ' AND c.fecha = ?';
      queryParams.push(fecha);
    } else if (fecha_inicio && fecha_fin) {
      whereClause += ' AND c.fecha BETWEEN ? AND ?';
      queryParams.push(fecha_inicio, fecha_fin);
    }

    // Manejamos el parámetro status del frontend
    if (status) {
      // Si contiene comas, significa múltiples estados
      if (status.includes(',')) {
        const statusList = status.split(',').map(s => s.trim());

        // Para MySQL, necesitamos manejar cada valor individualmente en lugar de usar IN
        // con una lista de parámetros, ya que puede causar problemas
        whereClause += ' AND (';
        const statusConditions = statusList.map((_, index) => {
          return 'c.estado = ?';
        });
        whereClause += statusConditions.join(' OR ');
        whereClause += ')';

        // Añadir cada valor de estado como un parámetro individual
        statusList.forEach(s => queryParams.push(s));
      } else {
        whereClause += ' AND c.estado = ?';
        queryParams.push(status);
      }
    }
    // Si no hay status, usamos el parámetro tradicional
    else if (estado) {
      whereClause += ' AND c.estado = ?';
      queryParams.push(estado);
    }

    if (sucursal_id && sucursal_id !== 'undefined' && sucursal_id !== 'null') {
      whereClause += ' AND c.sucursal_id = ?';
      queryParams.push(parseInt(sucursal_id));
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

    // Filtrar cualquier valor undefined o null de los queryParams
    const filteredQueryParams = queryParams.filter(param => param !== undefined && param !== null);

    const [results] = await db.execute(query, [...filteredQueryParams, parseInt(limit), offset]);

    // Obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM citas c
      ${whereClause}
    `;
    const [totalResults] = await db.execute(countQuery, filteredQueryParams);

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
        id: cita.cliente_id,
        nombres: cita.cliente_nombres,
        apellidos: cita.cliente_apellidos,
        nombre_completo: cita.cliente_nombre_completo,
        telefono: cita.cliente_telefono,
        email: cita.cliente_email
      },
      servicio: {
        id: cita.servicio_id,
        nombre: cita.servicio_nombre,
        duracion: cita.servicio_duracion,
        precio_base: cita.servicio_precio_base,
        precio: cita.servicio_precio,
        categoria: cita.categoria_nombre
      },
      personal: cita.personal_id ? {
        id: cita.personal_id,
        nombre: cita.personal_nombre,
        telefono: cita.personal_telefono
      } : null,
      sucursal: {
        id: cita.sucursal_id,
        nombre: cita.sucursal_nombre,
        direccion: cita.sucursal_direccion
      }
    }));

    res.json({
      success: true,
      data: formattedResults,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: totalResults[0].total,
        total_pages: Math.ceil(totalResults[0].total / limit)
      }
    });
  } catch (error) {
    logger.error('Error in getCitas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET cita por ID
const getCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    const query = `
      SELECT
        c.*,
        cl.nombres as cliente_nombres,
        cl.apellidos as cliente_apellidos,
        cl.telefono as cliente_telefono,
        cl.correo_electronico as cliente_email,
        cl.numero_documento,
        s.nombre as servicio_nombre,
        s.duracion as servicio_duracion,
        s.precio as servicio_precio_base,
        ss.precio as servicio_precio,
        cs.nombre as categoria_nombre,
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
      WHERE c.id = ? AND c.empresa_id = ?
    `;

    const [results] = await db.execute(query, [id, company_id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    const cita = results[0];

    res.json({
      success: true,
      data: {
        id: cita.id,
        fecha: cita.fecha,
        hora: cita.hora,
        estado: cita.estado,
        notas: cita.notas,
        canal: cita.canal,
        origen: cita.origen,
        cliente: {
          id: cita.cliente_id,
          nombres: cita.cliente_nombres,
          apellidos: cita.cliente_apellidos,
          telefono: cita.cliente_telefono,
          email: cita.cliente_email,
          documento: cita.numero_documento
        },
        servicio: {
          id: cita.servicio_id,
          nombre: cita.servicio_nombre,
          duracion: cita.servicio_duracion,
          precio_base: cita.servicio_precio_base,
          precio: cita.servicio_precio,
          categoria: cita.categoria_nombre
        },
        personal: cita.personal_id ? {
          id: cita.personal_id,
          nombre: cita.personal_nombre,
          telefono: cita.personal_telefono
        } : null,
        sucursal: {
          id: cita.sucursal_id,
          nombre: cita.sucursal_nombre,
          direccion: cita.sucursal_direccion
        }
      }
    });
  } catch (error) {
    logger.error('Error in getCita:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// POST crear nueva cita
const createCita = async (req, res) => {
  try {
    const {
      cliente_id, personal_id, servicio_id, sucursal_id,
      fecha, hora, notas = '', canal = 'Presencial', origen = 'Presencial'
    } = req.body;

    const { company_id, id: creado_por } = req.user;

    // Validaciones básicas
    if (!cliente_id || !servicio_id || !sucursal_id || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: 'Los campos cliente_id, servicio_id, sucursal_id, fecha y hora son requeridos'
      });
    }

    // Verificar que el cliente existe y pertenece a la empresa
    const [cliente] = await db.execute(
      'SELECT id FROM clientes WHERE id = ? AND empresa_id = ?',
      [cliente_id, company_id]
    );
    if (cliente.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado en esta empresa'
      });
    }

    // Verificar que la sucursal pertenece a la empresa
    const [sucursal] = await db.execute(
      'SELECT id FROM sucursales WHERE id = ? AND empresa_id = ?',
      [sucursal_id, company_id]
    );
    if (sucursal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada o no pertenece a su empresa'
      });
    }

    // Verificar que el servicio está disponible en la sucursal
    const [servicioSucursal] = await db.execute(
      'SELECT * FROM servicios_sucursal WHERE servicio_id = ? AND sucursal_id = ? AND estado = "Activo"',
      [servicio_id, sucursal_id]
    );
    if (servicioSucursal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no disponible en esta sucursal'
      });
    }

    // Verificar que el personal puede realizar el servicio (si se especifica)
    if (personal_id) {
      const [servicioPersonal] = await db.execute(
        'SELECT * FROM servicios_personal sp JOIN personal p ON sp.personal_id = p.id WHERE sp.personal_id = ? AND sp.servicio_id = ? AND p.empresa_id = ?',
        [personal_id, servicio_id, company_id]
      );
      if (servicioPersonal.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El personal seleccionado no puede realizar este servicio'
        });
      }
    }

    // Verificar disponibilidad de horario
    const [conflicto] = await db.execute(
      'SELECT id FROM citas WHERE fecha = ? AND hora = ? AND (personal_id = ? OR (sucursal_id = ? AND personal_id IS NULL)) AND estado NOT IN ("Cancelada")',
      [fecha, hora, personal_id, sucursal_id]
    );
    if (conflicto.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una cita programada en este horario'
      });
    }

    // Crear la cita
    const [result] = await db.execute(`
      INSERT INTO citas
      (empresa_id, cliente_id, personal_id, servicio_id, sucursal_id, fecha, hora, notas, canal, origen, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [empresa_id, cliente_id, personal_id, servicio_id, sucursal_id, fecha, hora, notas, canal, origen, creado_por]);

    // Notificar via WebSocket
    const { socketManager } = getManagers(req);
    if (socketManager) {
      socketManager.notifyNewAppointment({
        id: result.insertId,
        fecha,
        hora,
        cliente_id,
        servicio_id,
        empresa_id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Cita creada exitosamente',
      data: {
        id: result.insertId,
        fecha,
        hora,
        estado: 'Programada'
      }
    });
  } catch (error) {
    logger.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// PUT actualizar cita
const updateCita = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cliente_id, personal_id, servicio_id, sucursal_id,
      fecha, hora, estado, notas, canal
    } = req.body;

    const actualizado_por = req.user?.id || 1;

    // Verificar que la cita existe
    const [existingCita] = await db.execute('SELECT * FROM citas WHERE id = ?', [id]);
    if (existingCita.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Si se cambia fecha/hora, verificar disponibilidad
    if ((fecha && fecha !== existingCita[0].fecha) || (hora && hora !== existingCita[0].hora)) {
      const nuevaFecha = fecha || existingCita[0].fecha;
      const nuevaHora = hora || existingCita[0].hora;
      const nuevoPersonal = personal_id || existingCita[0].personal_id;
      const nuevaSucursal = sucursal_id || existingCita[0].sucursal_id;

      const [conflicto] = await db.execute(
        'SELECT id FROM citas WHERE fecha = ? AND hora = ? AND (personal_id = ? OR (sucursal_id = ? AND personal_id IS NULL)) AND estado NOT IN ("Cancelada") AND id != ?',
        [nuevaFecha, nuevaHora, nuevoPersonal, nuevaSucursal, id]
      );

      if (conflicto.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una cita programada en este horario'
        });
      }
    }

    // Actualizar la cita
    const updateFields = [];
    const updateValues = [];

    if (cliente_id) { updateFields.push('cliente_id = ?'); updateValues.push(cliente_id); }
    if (personal_id) { updateFields.push('personal_id = ?'); updateValues.push(personal_id); }
    if (servicio_id) { updateFields.push('servicio_id = ?'); updateValues.push(servicio_id); }
    if (sucursal_id) { updateFields.push('sucursal_id = ?'); updateValues.push(sucursal_id); }
    if (fecha) { updateFields.push('fecha = ?'); updateValues.push(fecha); }
    if (hora) { updateFields.push('hora = ?'); updateValues.push(hora); }
    if (estado) { updateFields.push('estado = ?'); updateValues.push(estado); }
    if (notas !== undefined) { updateFields.push('notas = ?'); updateValues.push(notas); }
    if (canal) { updateFields.push('canal = ?'); updateValues.push(canal); }

    updateFields.push('actualizado_por = ?');
    updateValues.push(actualizado_por, id);

    if (updateFields.length > 1) { // > 1 porque siempre agregamos actualizado_por
      await db.execute(
        `UPDATE citas SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // Notificar via WebSocket
    const { socketManager } = getManagers(req);
    if (socketManager) {
      socketManager.notifyAppointmentUpdate({
        id,
        ...req.body
      });
    }

    res.json({
      success: true,
      message: 'Cita actualizada exitosamente'
    });
  } catch (error) {
    logger.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// DELETE eliminar cita
const deleteCita = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la cita existe
    const [existingCita] = await db.execute('SELECT * FROM citas WHERE id = ?', [id]);
    if (existingCita.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Cambiar estado a cancelada en lugar de eliminar
    await db.execute(
      'UPDATE citas SET estado = "Cancelada", actualizado_por = ? WHERE id = ?',
      [req.user?.id || 1, id]
    );

    // Notificar via WebSocket
    const { socketManager } = getManagers(req);
    if (socketManager) {
      socketManager.notifyAppointmentCancellation({
        id,
        estado: 'Cancelada'
      });
    }

    res.json({
      success: true,
      message: 'Cita cancelada exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET estadísticas de citas
const getEstadisticasCitas = async (req, res) => {
  try {
    const { empresa_id } = req.params;

    const [stats] = await db.execute(`
      SELECT
        COUNT(*) as total_citas,
        COUNT(CASE WHEN estado = 'Programada' THEN 1 END) as programadas,
        COUNT(CASE WHEN estado = 'Completada' THEN 1 END) as completadas,
        COUNT(CASE WHEN estado = 'Cancelada' THEN 1 END) as canceladas,
        COUNT(CASE WHEN estado = 'Confirmada' THEN 1 END) as confirmadas,
        COUNT(CASE WHEN DATE(fecha) = CURDATE() THEN 1 END) as hoy,
        COUNT(CASE WHEN WEEK(fecha) = WEEK(CURRENT_DATE) THEN 1 END) as esta_semana,
        COUNT(CASE WHEN MONTH(fecha) = MONTH(CURRENT_DATE) THEN 1 END) as este_mes
      FROM citas
      WHERE empresa_id = ?
    `, [empresa_id]);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    logger.error('Error getting appointment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET citas por sucursal
const getCitasPorSucursal = async (req, res) => {
  try {
    const { empresa_id, sucursal_id } = req.params;
    const { fecha } = req.query;

    let whereClause = 'WHERE c.empresa_id = ? AND c.sucursal_id = ?';
    const params = [empresa_id, sucursal_id];

    if (fecha) {
      whereClause += ' AND c.fecha = ?';
      params.push(fecha);
    }

    const [citas] = await db.execute(`
      SELECT
        c.*,
        CONCAT(cl.nombres, ' ', cl.apellidos) as cliente_nombre,
        cl.telefono as cliente_telefono,
        s.nombre as servicio_nombre,
        s.duracion,
        u.nombre as personal_nombre
      FROM citas c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN servicios s ON c.servicio_id = s.id
      LEFT JOIN personal p ON c.personal_id = p.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ${whereClause}
      ORDER BY c.fecha ASC, c.hora ASC
    `, params);

    res.json({
      success: true,
      data: citas
    });
  } catch (error) {
    logger.error('Error getting appointments by branch:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET eventos de calendario (implementación básica para evitar error de callback undefined)
const getAppointmentsCalendar = async (req, res) => {
  try {
    // Aquí puedes implementar la lógica real según el modelo de tu base de datos
    // Por ahora, se devuelve un array vacío para evitar errores
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

// GET filtros para citas (implementación básica para evitar error de callback undefined)
const getAppointmentsFilters = async (req, res) => {
  try {
    // Aquí puedes implementar la lógica real según el modelo de tu base de datos
    // Por ahora, se devuelve un objeto vacío para evitar errores
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

module.exports = {
  getCitas,
  getCita,
  createCita,
  updateCita,
  deleteCita,
  getEstadisticasCitas,
  getCitasPorSucursal,
  getAppointmentsCalendar,
  getAppointmentsFilters
};
