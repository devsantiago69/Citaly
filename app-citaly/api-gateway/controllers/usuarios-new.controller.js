const db = require('../config/database');
const logger = require('../logger');

// GET usuarios por empresa
const getUsuarios = async (req, res) => {
  try {
    const { empresa_id } = req.params;
    const {
      search = '',
      rol = '',
      estado = '',
      tipo_usuario_id = '',
      page = 1,
      limit = 10
    } = req.query;

    logger.info('GET /api/users - Request received', {
      empresa_id,
      search,
      rol,
      estado,
      tipo_usuario_id
    });

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE u.empresa_id = ?';
    const queryParams = [empresa_id];

    if (search) {
      whereClause += ' AND (u.nombre LIKE ? OR u.correo_electronico LIKE ? OR u.telefono LIKE ?)';
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam);
    }

    if (rol) {
      whereClause += ' AND u.rol = ?';
      queryParams.push(rol);
    }

    if (estado !== '') {
      whereClause += ' AND u.estado = ?';
      queryParams.push(estado);
    }

    if (tipo_usuario_id) {
      whereClause += ' AND u.tipo_usuario_id = ?';
      queryParams.push(tipo_usuario_id);
    }

    const query = `
      SELECT
        u.*,
        tu.nombre as tipo_usuario_nombre,
        tu.descripcion as tipo_usuario_descripcion,
        tu.nivel as tipo_usuario_nivel,
        uc.nombre as creado_por_nombre,
        p.id as personal_id,
        p.sucursal_id,
        s.nombre as sucursal_nombre,
        (SELECT COUNT(*) FROM citas c WHERE c.personal_id = p.id) as total_citas
      FROM usuarios u
      LEFT JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      LEFT JOIN usuarios uc ON u.creado_por = uc.id
      LEFT JOIN personal p ON u.id = p.usuario_id
      LEFT JOIN sucursales s ON p.sucursal_id = s.id
      ${whereClause}
      ORDER BY u.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `;

    const [usuarios] = await db.execute(query, [...queryParams, parseInt(limit), offset]);

    // Obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM usuarios u
      ${whereClause}
    `;
    const [totalResults] = await db.execute(countQuery, queryParams);

    res.json({
      success: true,
      data: usuarios,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: totalResults[0].total,
        total_pages: Math.ceil(totalResults[0].total / limit)
      }
    });
  } catch (error) {
    logger.error('Error in getUsuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET usuario por ID
const getUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const [usuario] = await db.execute(`
      SELECT
        u.*,
        tu.nombre as tipo_usuario_nombre,
        tu.descripcion as tipo_usuario_descripcion,
        tu.nivel as tipo_usuario_nivel,
        tu.permisos as tipo_usuario_permisos,
        e.nombre as empresa_nombre,
        uc.nombre as creado_por_nombre,
        ua.nombre as actualizado_por_nombre,
        p.id as personal_id,
        p.sucursal_id,
        p.calificacion,
        s.nombre as sucursal_nombre
      FROM usuarios u
      LEFT JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      LEFT JOIN empresas e ON u.empresa_id = e.id
      LEFT JOIN usuarios uc ON u.creado_por = uc.id
      LEFT JOIN usuarios ua ON u.actualizado_por = ua.id
      LEFT JOIN personal p ON u.id = p.usuario_id
      LEFT JOIN sucursales s ON p.sucursal_id = s.id
      WHERE u.id = ?
    `, [id]);

    if (usuario.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si es personal, obtener especialidades y servicios
    if (usuario[0].personal_id) {
      const [especialidades] = await db.execute(`
        SELECT e.*, ep.principal
        FROM especialidades_personal ep
        JOIN especialidades e ON ep.especialidad_id = e.id
        WHERE ep.personal_id = ?
      `, [usuario[0].personal_id]);

      const [servicios] = await db.execute(`
        SELECT s.*, sp.principal
        FROM servicios_personal sp
        JOIN servicios s ON sp.servicio_id = s.id
        WHERE sp.personal_id = ?
      `, [usuario[0].personal_id]);

      usuario[0].especialidades = especialidades;
      usuario[0].servicios = servicios;
    }

    res.json({
      success: true,
      data: usuario[0]
    });
  } catch (error) {
    logger.error('Error in getUsuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// POST crear usuario
const createUsuario = async (req, res) => {
  try {
    const {
      empresa_id, tipo_usuario_id, nombre, correo_electronico, contrasena,
      rol, telefono, sucursal_id = null, es_personal = false
    } = req.body;

    const creado_por = req.user?.id || 1;

    // Validaciones básicas
    if (!empresa_id || !nombre || !correo_electronico || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Los campos empresa_id, nombre, correo_electronico y rol son requeridos'
      });
    }

    // Verificar que el correo no existe en la empresa
    const [existingUser] = await db.execute(
      'SELECT id FROM usuarios WHERE empresa_id = ? AND correo_electronico = ?',
      [empresa_id, correo_electronico]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con este correo electrónico en la empresa'
      });
    }

    // Crear usuario
    const [result] = await db.execute(`
      INSERT INTO usuarios
      (empresa_id, tipo_usuario_id, nombre, correo_electronico, contrasena, rol, telefono, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [empresa_id, tipo_usuario_id, nombre, correo_electronico, contrasena, rol, telefono, creado_por]);

    const usuario_id = result.insertId;

    // Si es personal, crear registro en tabla personal
    if (es_personal && (rol === 'Personal' || rol === 'Admin')) {
      await db.execute(`
        INSERT INTO personal (empresa_id, usuario_id, sucursal_id, creado_por)
        VALUES (?, ?, ?, ?)
      `, [empresa_id, usuario_id, sucursal_id, creado_por]);
    }

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        id: usuario_id,
        nombre,
        correo_electronico,
        rol
      }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// PUT actualizar usuario
const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tipo_usuario_id, nombre, correo_electronico, telefono, estado,
      sucursal_id
    } = req.body;

    const actualizado_por = req.user?.id || 1;

    // Verificar que el usuario existe
    const [existingUser] = await db.execute('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si se está actualizando el correo, verificar que no exista otro usuario con el mismo
    if (correo_electronico && correo_electronico !== existingUser[0].correo_electronico) {
      const [duplicateUser] = await db.execute(
        'SELECT id FROM usuarios WHERE empresa_id = ? AND correo_electronico = ? AND id != ?',
        [existingUser[0].empresa_id, correo_electronico, id]
      );

      if (duplicateUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro usuario con este correo electrónico en la empresa'
        });
      }
    }

    // Actualizar usuario
    const updateFields = [];
    const updateValues = [];

    if (tipo_usuario_id) { updateFields.push('tipo_usuario_id = ?'); updateValues.push(tipo_usuario_id); }
    if (nombre) { updateFields.push('nombre = ?'); updateValues.push(nombre); }
    if (correo_electronico) { updateFields.push('correo_electronico = ?'); updateValues.push(correo_electronico); }
    if (telefono) { updateFields.push('telefono = ?'); updateValues.push(telefono); }
    if (estado !== undefined) { updateFields.push('estado = ?'); updateValues.push(estado); }

    updateFields.push('actualizado_por = ?');
    updateValues.push(actualizado_por, id);

    if (updateFields.length > 1) {
      await db.execute(
        `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // Si se actualiza sucursal y el usuario es personal
    if (sucursal_id !== undefined) {
      const [personal] = await db.execute('SELECT id FROM personal WHERE usuario_id = ?', [id]);
      if (personal.length > 0) {
        await db.execute(
          'UPDATE personal SET sucursal_id = ?, actualizado_por = ? WHERE usuario_id = ?',
          [sucursal_id, actualizado_por, id]
        );
      }
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// DELETE desactivar usuario
const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado_por = req.user?.id || 1;

    // Verificar que el usuario existe
    const [existingUser] = await db.execute('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Cambiar estado a inactivo en lugar de eliminar
    await db.execute(
      'UPDATE usuarios SET estado = 1, actualizado_por = ? WHERE id = ?',
      [actualizado_por, id]
    );

    // Si es personal, también desactivar en tabla personal
    await db.execute(
      'UPDATE personal SET estado = 1, actualizado_por = ? WHERE usuario_id = ?',
      [actualizado_por, id]
    );

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET tipos de usuario por empresa
const getTiposUsuario = async (req, res) => {
  try {
    const { empresa_id } = req.params;

    const [tipos] = await db.execute(`
      SELECT tu.*,
             u.nombre as creado_por_nombre,
             (SELECT COUNT(*) FROM usuarios u WHERE u.tipo_usuario_id = tu.id AND u.estado = 0) as usuarios_activos
      FROM tipos_usuario tu
      LEFT JOIN usuarios u ON tu.creado_por = u.id
      WHERE tu.empresa_id = ? AND tu.estado = 0
      ORDER BY tu.nivel, tu.nombre
    `, [empresa_id]);

    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    logger.error('Error getting user types:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// POST crear tipo de usuario
const createTipoUsuario = async (req, res) => {
  try {
    const { empresa_id, nombre, descripcion, permisos, nivel } = req.body;
    const creado_por = req.user?.id || 1;

    if (!empresa_id || !nombre || !nivel) {
      return res.status(400).json({
        success: false,
        message: 'Los campos empresa_id, nombre y nivel son requeridos'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO tipos_usuario (empresa_id, nombre, descripcion, permisos, nivel, creado_por)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [empresa_id, nombre, descripcion, JSON.stringify(permisos || {}), nivel, creado_por]);

    res.status(201).json({
      success: true,
      message: 'Tipo de usuario creado exitosamente',
      data: {
        id: result.insertId,
        nombre,
        nivel
      }
    });
  } catch (error) {
    logger.error('Error creating user type:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET estadísticas de usuarios
const getEstadisticasUsuarios = async (req, res) => {
  try {
    const { empresa_id } = req.params;

    const [stats] = await db.execute(`
      SELECT
        COUNT(*) as total_usuarios,
        COUNT(CASE WHEN estado = 0 THEN 1 END) as usuarios_activos,
        COUNT(CASE WHEN estado = 1 THEN 1 END) as usuarios_inactivos,
        COUNT(CASE WHEN rol = 'Admin' THEN 1 END) as administradores,
        COUNT(CASE WHEN rol = 'Personal' THEN 1 END) as personal,
        COUNT(CASE WHEN rol = 'Cliente' THEN 1 END) as clientes,
        COUNT(CASE WHEN DATE(fecha_creacion) = CURDATE() THEN 1 END) as nuevos_hoy,
        COUNT(CASE WHEN MONTH(fecha_creacion) = MONTH(CURRENT_DATE) THEN 1 END) as nuevos_mes
      FROM usuarios
      WHERE empresa_id = ?
    `, [empresa_id]);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET buscar usuarios
const searchUsuarios = async (req, res) => {
  try {
    const { empresa_id } = req.params;
    const { q, rol } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Parámetro de búsqueda requerido'
      });
    }

    let whereClause = 'WHERE u.empresa_id = ? AND u.estado = 0';
    const params = [empresa_id];

    if (rol) {
      whereClause += ' AND u.rol = ?';
      params.push(rol);
    }

    const [usuarios] = await db.execute(`
      SELECT u.id, u.nombre, u.correo_electronico, u.telefono, u.rol,
             tu.nombre as tipo_usuario_nombre
      FROM usuarios u
      LEFT JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      ${whereClause}
      AND (u.nombre LIKE ? OR u.correo_electronico LIKE ? OR u.telefono LIKE ?)
      ORDER BY u.nombre
      LIMIT 20
    `, [...params, `%${q}%`, `%${q}%`, `%${q}%`]);

    res.json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getTiposUsuario,
  createTipoUsuario,
  getEstadisticasUsuarios,
  searchUsuarios
};
