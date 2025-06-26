const db = require('../config/db');
const logger = require('../logger');

const sucursalesController = {
  // Obtener todas las sucursales
  getAllSucursales: async (req, res) => {
    try {
      const { page = 1, limit = 50, activo } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let params = [];

      if (activo !== undefined) {
        whereConditions.push('s.activo = ?');
        params.push(activo === 'true');
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const query = `
        SELECT
          s.*,
          COUNT(c.id) as total_cajas,
          COUNT(CASE WHEN c.activo = 1 THEN 1 END) as cajas_activas,
          COUNT(p.id) as total_personal
        FROM sucursales s
        LEFT JOIN cajas c ON s.id = c.sucursal_id
        LEFT JOIN personal p ON s.id = p.sucursal_id AND p.activo = 1
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.fecha_creacion DESC
        LIMIT ? OFFSET ?
      `;

      params.push(parseInt(limit), offset);

      const [sucursales] = await db.execute(query, params);

      // Contar total
      const countQuery = `SELECT COUNT(*) as total FROM sucursales s ${whereClause}`;
      const [countResult] = await db.execute(countQuery, params.slice(0, -2));
      const total = countResult[0].total;

      res.json({
        success: true,
        data: sucursales,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error al obtener sucursales:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener sucursal por ID
  getSucursalById: async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT
          s.*,
          COUNT(c.id) as total_cajas,
          COUNT(CASE WHEN c.activo = 1 THEN 1 END) as cajas_activas,
          COUNT(p.id) as total_personal
        FROM sucursales s
        LEFT JOIN cajas c ON s.id = c.sucursal_id
        LEFT JOIN personal p ON s.id = p.sucursal_id AND p.activo = 1
        WHERE s.id = ?
        GROUP BY s.id
      `;

      const [sucursales] = await db.execute(query, [id]);

      if (sucursales.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Sucursal no encontrada'
        });
      }

      // Obtener cajas de la sucursal
      const [cajas] = await db.execute(`
        SELECT
          c.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM cajas c
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.sucursal_id = ?
        ORDER BY c.numero_caja
      `, [id]);

      // Obtener personal de la sucursal
      const [personal] = await db.execute(`
        SELECT
          p.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM personal p
        LEFT JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.sucursal_id = ? AND p.activo = 1
        ORDER BY p.nombre
      `, [id]);

      const sucursal = sucursales[0];
      sucursal.cajas = cajas;
      sucursal.personal = personal;

      res.json({
        success: true,
        data: sucursal
      });

    } catch (error) {
      logger.error('Error al obtener sucursal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Crear nueva sucursal con configuración completa
  createSucursal: async (req, res) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        nombre,
        direccion,
        ciudad,
        telefono,
        email,
        horario_apertura,
        horario_cierre,
        configuracion = {},
        cajas = [], // Array de cajas a crear
        personal_asignado = [] // Array de personal a asignar
      } = req.body;

      // Validaciones básicas
      if (!nombre || !direccion || !ciudad) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Los campos nombre, direccion y ciudad son requeridos'
        });
      }

      // 1. Crear la sucursal
      const [sucursalResult] = await connection.execute(`
        INSERT INTO sucursales (
          nombre, direccion, ciudad, telefono, email,
          horario_apertura, horario_cierre, configuracion,
          activo, fecha_creacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
      `, [
        nombre, direccion, ciudad, telefono, email,
        horario_apertura, horario_cierre, JSON.stringify(configuracion)
      ]);

      const sucursalId = sucursalResult.insertId;

      // 2. Crear cajas para la sucursal
      const cajasCreadas = [];
      if (cajas && cajas.length > 0) {
        for (const caja of cajas) {
          const [cajaResult] = await connection.execute(`
            INSERT INTO cajas (
              sucursal_id, numero_caja, nombre, usuario_id,
              monto_inicial, activo, fecha_creacion
            ) VALUES (?, ?, ?, ?, ?, 1, NOW())
          `, [
            sucursalId,
            caja.numero_caja,
            caja.nombre || `Caja ${caja.numero_caja}`,
            caja.usuario_id || null,
            caja.monto_inicial || 0
          ]);

          cajasCreadas.push({
            id: cajaResult.insertId,
            numero_caja: caja.numero_caja,
            nombre: caja.nombre,
            usuario_id: caja.usuario_id,
            monto_inicial: caja.monto_inicial
          });

          // Si se asigna un usuario a la caja, crear sesión inicial
          if (caja.usuario_id && caja.monto_inicial > 0) {
            await connection.execute(`
              INSERT INTO sesiones_caja (
                caja_id, usuario_id, monto_inicial,
                fecha_apertura, estado
              ) VALUES (?, ?, ?, NOW(), 'abierta')
            `, [cajaResult.insertId, caja.usuario_id, caja.monto_inicial]);
          }
        }
      }

      // 3. Asignar personal a la sucursal
      const personalAsignado = [];
      if (personal_asignado && personal_asignado.length > 0) {
        for (const personalId of personal_asignado) {
          await connection.execute(`
            UPDATE personal
            SET sucursal_id = ?, fecha_actualizacion = NOW()
            WHERE id = ? AND activo = 1
          `, [sucursalId, personalId]);

          personalAsignado.push(personalId);
        }
      }

      await connection.commit();

      // Obtener la sucursal creada con toda la información
      const [sucursalCompleta] = await db.execute(`
        SELECT
          s.*,
          COUNT(c.id) as total_cajas,
          COUNT(p.id) as total_personal
        FROM sucursales s
        LEFT JOIN cajas c ON s.id = c.sucursal_id
        LEFT JOIN personal p ON s.id = p.sucursal_id AND p.activo = 1
        WHERE s.id = ?
        GROUP BY s.id
      `, [sucursalId]);

      logger.info('Sucursal creada exitosamente:', {
        sucursalId,
        nombre,
        cajasCreadas: cajasCreadas.length,
        personalAsignado: personalAsignado.length
      });

      res.status(201).json({
        success: true,
        message: 'Sucursal creada exitosamente con toda su configuración',
        data: {
          sucursal: sucursalCompleta[0],
          cajas_creadas: cajasCreadas,
          personal_asignado: personalAsignado
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Error al crear sucursal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Actualizar sucursal
  updateSucursal: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Verificar que la sucursal existe
      const [existingSucursal] = await db.execute('SELECT * FROM sucursales WHERE id = ?', [id]);

      if (existingSucursal.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Sucursal no encontrada'
        });
      }

      // Construir query de actualización dinámico
      const allowedFields = [
        'nombre', 'direccion', 'ciudad', 'telefono', 'email',
        'horario_apertura', 'horario_cierre', 'configuracion', 'activo'
      ];

      const updateFields = [];
      const updateValues = [];

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          if (key === 'configuracion') {
            updateFields.push(`${key} = ?`);
            updateValues.push(JSON.stringify(updates[key]));
          } else {
            updateFields.push(`${key} = ?`);
            updateValues.push(updates[key]);
          }
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
        UPDATE sucursales
        SET ${updateFields.join(', ')}, fecha_actualizacion = NOW()
        WHERE id = ?
      `;

      await db.execute(query, updateValues);

      logger.info('Sucursal actualizada:', { sucursalId: id, updates });

      res.json({
        success: true,
        message: 'Sucursal actualizada exitosamente'
      });

    } catch (error) {
      logger.error('Error al actualizar sucursal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Eliminar sucursal (soft delete)
  deleteSucursal: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que la sucursal existe
      const [existingSucursal] = await db.execute('SELECT * FROM sucursales WHERE id = ?', [id]);

      if (existingSucursal.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Sucursal no encontrada'
        });
      }

      // Verificar que no tenga citas activas
      const [citasActivas] = await db.execute(`
        SELECT COUNT(*) as total
        FROM citas
        WHERE sucursal_id = ? AND estado NOT IN ('completada', 'cancelada')
      `, [id]);

      if (citasActivas[0].total > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar la sucursal porque tiene citas activas'
        });
      }

      // Soft delete
      await db.execute(`
        UPDATE sucursales
        SET activo = 0, fecha_actualizacion = NOW()
        WHERE id = ?
      `, [id]);

      // Desactivar cajas asociadas
      await db.execute(`
        UPDATE cajas
        SET activo = 0, fecha_actualizacion = NOW()
        WHERE sucursal_id = ?
      `, [id]);

      logger.info('Sucursal desactivada:', { sucursalId: id });

      res.json({
        success: true,
        message: 'Sucursal desactivada exitosamente'
      });

    } catch (error) {
      logger.error('Error al eliminar sucursal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Crear nueva sucursal (placeholder)
  createSucursal: async (req, res) => {
    try {
      res.status(201).json({ success: true, message: 'Sucursal creada (implementación pendiente)' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
  },

  // Actualizar sucursal (placeholder)
  updateSucursal: async (req, res) => {
    try {
      res.json({ success: true, message: 'Sucursal actualizada (implementación pendiente)' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
  },

  // Eliminar sucursal (soft delete, placeholder)
  deleteSucursal: async (req, res) => {
    try {
      res.json({ success: true, message: 'Sucursal eliminada (implementación pendiente)' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
  },

  // Agregar caja a sucursal (placeholder)
  addCaja: async (req, res) => {
    try {
      res.status(201).json({ success: true, message: 'Caja agregada (implementación pendiente)' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
  },

  // Obtener estadísticas de sucursal (placeholder)
  getEstadisticas: async (req, res) => {
    try {
      res.json({ success: true, data: {} });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
  }
};

module.exports = sucursalesController;
