// controllers/citas-new.controller.js
// Controlador para la gestión de citas con la nueva estructura de base de datos

const db = require('../config/db');
const logger = require('../logger');

const citasNewController = {
  // Obtener todas las citas
  getAllCitas: async (req, res) => {
    try {
      const { page = 1, limit = 50, sucursal_id, personal_id, fecha_inicio, fecha_fin, estado } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let params = [];

      if (sucursal_id) {
        whereConditions.push('c.sucursal_id = ?');
        params.push(sucursal_id);
      }

      if (personal_id) {
        whereConditions.push('c.personal_id = ?');
        params.push(personal_id);
      }

      if (fecha_inicio && fecha_fin) {
        whereConditions.push('DATE(c.fecha_hora) BETWEEN ? AND ?');
        params.push(fecha_inicio, fecha_fin);
      }

      if (estado) {
        whereConditions.push('c.estado = ?');
        params.push(estado);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const query = `
        SELECT
          c.*,
          cl.nombre as cliente_nombre,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          p.nombre as personal_nombre,
          p.especialidad as personal_especialidad,
          s.nombre as sucursal_nombre,
          srv.nombre as servicio_nombre,
          srv.duracion_minutos,
          srv.precio
        FROM citas c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN personal p ON c.personal_id = p.id
        LEFT JOIN sucursales s ON c.sucursal_id = s.id
        LEFT JOIN servicios srv ON c.servicio_id = srv.id
        ${whereClause}
        ORDER BY c.fecha_hora DESC
        LIMIT ? OFFSET ?
      `;

      params.push(parseInt(limit), offset);

      const [citas] = await db.execute(query, params);

      // Contar total para paginación
      const countQuery = `
        SELECT COUNT(*) as total
        FROM citas c
        ${whereClause}
      `;

      const [countResult] = await db.execute(countQuery, params.slice(0, -2));
      const total = countResult[0].total;

      res.json({
        success: true,
        data: citas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error al obtener citas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener cita por ID
  getCitaById: async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT
          c.*,
          cl.nombre as cliente_nombre,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          p.nombre as personal_nombre,
          p.especialidad as personal_especialidad,
          s.nombre as sucursal_nombre,
          srv.nombre as servicio_nombre,
          srv.duracion_minutos,
          srv.precio
        FROM citas c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN personal p ON c.personal_id = p.id
        LEFT JOIN sucursales s ON c.sucursal_id = s.id
        LEFT JOIN servicios srv ON c.servicio_id = srv.id
        WHERE c.id = ?
      `;

      const [citas] = await db.execute(query, [id]);

      if (citas.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      res.json({
        success: true,
        data: citas[0]
      });

    } catch (error) {
      logger.error('Error al obtener cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Crear nueva cita
  createCita: async (req, res) => {
    try {
      const {
        cliente_id,
        personal_id,
        sucursal_id,
        servicio_id,
        fecha_hora,
        duracion_minutos,
        precio,
        estado = 'programada',
        notas,
        recordatorio_enviado = false
      } = req.body;

      // Validaciones básicas
      if (!cliente_id || !personal_id || !sucursal_id || !servicio_id || !fecha_hora) {
        return res.status(400).json({
          success: false,
          message: 'Campos requeridos: cliente_id, personal_id, sucursal_id, servicio_id, fecha_hora'
        });
      }

      const query = `
        INSERT INTO citas (
          cliente_id, personal_id, sucursal_id, servicio_id,
          fecha_hora, duracion_minutos, precio, estado,
          notas, recordatorio_enviado, fecha_creacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const [result] = await db.execute(query, [
        cliente_id, personal_id, sucursal_id, servicio_id,
        fecha_hora, duracion_minutos, precio, estado,
        notas, recordatorio_enviado
      ]);

      logger.info('Cita creada:', { citaId: result.insertId, cliente_id, personal_id });

      res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente',
        data: { id: result.insertId }
      });

    } catch (error) {
      logger.error('Error al crear cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Actualizar cita
  updateCita: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Verificar que la cita existe
      const [existingCita] = await db.execute('SELECT * FROM citas WHERE id = ?', [id]);

      if (existingCita.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Construir query de actualización dinámico
      const allowedFields = [
        'cliente_id', 'personal_id', 'sucursal_id', 'servicio_id',
        'fecha_hora', 'duracion_minutos', 'precio', 'estado',
        'notas', 'recordatorio_enviado'
      ];

      const updateFields = [];
      const updateValues = [];

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          updateValues.push(updates[key]);
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos válidos para actualizar'
        });
      }

      updateValues.push(id);

      const query = `
        UPDATE citas
        SET ${updateFields.join(', ')}, fecha_actualizacion = NOW()
        WHERE id = ?
      `;

      await db.execute(query, updateValues);

      logger.info('Cita actualizada:', { citaId: id, updates });

      res.json({
        success: true,
        message: 'Cita actualizada exitosamente'
      });

    } catch (error) {
      logger.error('Error al actualizar cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Eliminar cita
  deleteCita: async (req, res) => {
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

      await db.execute('DELETE FROM citas WHERE id = ?', [id]);

      logger.info('Cita eliminada:', { citaId: id });

      res.json({
        success: true,
        message: 'Cita eliminada exitosamente'
      });

    } catch (error) {
      logger.error('Error al eliminar cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener disponibilidad de personal
  getAvailability: async (req, res) => {
    try {
      const { personal_id, sucursal_id, fecha } = req.query;

      if (!personal_id || !sucursal_id || !fecha) {
        return res.status(400).json({
          success: false,
          message: 'Campos requeridos: personal_id, sucursal_id, fecha'
        });
      }

      // Obtener citas existentes para esa fecha
      const query = `
        SELECT
          TIME(fecha_hora) as hora,
          duracion_minutos
        FROM citas
        WHERE personal_id = ?
        AND sucursal_id = ?
        AND DATE(fecha_hora) = ?
        AND estado NOT IN ('cancelada', 'completada')
        ORDER BY fecha_hora
      `;

      const [citasExistentes] = await db.execute(query, [personal_id, sucursal_id, fecha]);

      res.json({
        success: true,
        data: {
          fecha,
          personal_id,
          sucursal_id,
          citas_existentes: citasExistentes
        }
      });

    } catch (error) {
      logger.error('Error al obtener disponibilidad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Cambiar estado de cita
  changeStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { estado, notas } = req.body;

      const validStates = ['programada', 'confirmada', 'en_proceso', 'completada', 'cancelada', 'no_asistio'];

      if (!validStates.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Estados válidos: ' + validStates.join(', ')
        });
      }

      // Verificar que la cita existe
      const [existingCita] = await db.execute('SELECT * FROM citas WHERE id = ?', [id]);

      if (existingCita.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      const query = `
        UPDATE citas
        SET estado = ?, notas = COALESCE(?, notas), fecha_actualizacion = NOW()
        WHERE id = ?
      `;

      await db.execute(query, [estado, notas, id]);

      logger.info('Estado de cita cambiado:', { citaId: id, nuevoEstado: estado });

      res.json({
        success: true,
        message: 'Estado de cita actualizado exitosamente'
      });

    } catch (error) {
      logger.error('Error al cambiar estado de cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
};

module.exports = citasNewController;