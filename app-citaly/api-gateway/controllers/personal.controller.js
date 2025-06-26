const db = require('../config/database');

// Obtener todo el personal de una empresa
const getPersonal = async (req, res) => {
  try {
    const { empresa_id } = req.params;
    const { sucursal_id, estado, page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.empresa_id = ?';
    const queryParams = [empresa_id];

    if (sucursal_id) {
      whereClause += ' AND p.sucursal_id = ?';
      queryParams.push(sucursal_id);
    }

    if (estado !== '') {
      whereClause += ' AND p.estado = ?';
      queryParams.push(estado);
    }

    const [personal] = await db.execute(`
      SELECT
        p.*,
        u.nombre,
        u.correo_electronico,
        u.telefono,
        u.rol,
        s.nombre as sucursal_nombre,
        tu.nombre as tipo_usuario_nombre,
        uc.nombre as creado_por_nombre,
        (SELECT COUNT(*) FROM citas c WHERE c.personal_id = p.id) as total_citas,
        (SELECT COUNT(*) FROM citas c WHERE c.personal_id = p.id AND c.estado = 'Completada') as citas_completadas,
        (SELECT COUNT(*) FROM servicios_personal sp WHERE sp.personal_id = p.id) as servicios_asignados,
        (SELECT COUNT(*) FROM especialidades_personal ep WHERE ep.personal_id = p.id) as especialidades_asignadas
      FROM personal p
      JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN sucursales s ON p.sucursal_id = s.id
      LEFT JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      LEFT JOIN usuarios uc ON p.creado_por = uc.id
      ${whereClause}
      ORDER BY u.nombre
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Obtener total de registros
    const [total] = await db.execute(`
      SELECT COUNT(*) as count
      FROM personal p
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      data: personal,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: total[0].count,
        total_pages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener personal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener personal específico
const getPersonalById = async (req, res) => {
  try {
    const { id } = req.params;

    const [personal] = await db.execute(`
      SELECT
        p.*,
        u.nombre,
        u.correo_electronico,
        u.telefono,
        u.rol,
        s.nombre as sucursal_nombre,
        s.direccion as sucursal_direccion,
        tu.nombre as tipo_usuario_nombre,
        e.nombre as empresa_nombre
      FROM personal p
      JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN sucursales s ON p.sucursal_id = s.id
      LEFT JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      LEFT JOIN empresas e ON p.empresa_id = e.id
      WHERE p.id = ?
    `, [id]);

    if (personal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Personal no encontrado'
      });
    }

    // Obtener especialidades del personal
    const [especialidades] = await db.execute(`
      SELECT e.*, ep.principal
      FROM especialidades_personal ep
      JOIN especialidades e ON ep.especialidad_id = e.id
      WHERE ep.personal_id = ?
      ORDER BY ep.principal DESC, e.nombre
    `, [id]);

    // Obtener servicios del personal
    const [servicios] = await db.execute(`
      SELECT s.*, sp.principal, cs.nombre as categoria_nombre
      FROM servicios_personal sp
      JOIN servicios s ON sp.servicio_id = s.id
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      WHERE sp.personal_id = ?
      ORDER BY sp.principal DESC, s.nombre
    `, [id]);

    // Obtener horarios del personal
    const [horarios] = await db.execute(`
      SELECT * FROM horarios_personal
      WHERE personal_id = ? AND activo = TRUE
      ORDER BY FIELD(dia, 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo')
    `, [id]);

    res.json({
      success: true,
      data: {
        ...personal[0],
        especialidades,
        servicios,
        horarios
      }
    });
  } catch (error) {
    console.error('Error al obtener personal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nuevo personal
const createPersonal = async (req, res) => {
  try {
    const { empresa_id, usuario_id, sucursal_id, calificacion = 0 } = req.body;
    const creado_por = req.user?.id || 1;

    // Validaciones básicas
    if (!empresa_id || !usuario_id) {
      return res.status(400).json({
        success: false,
        message: 'Los campos empresa_id y usuario_id son requeridos'
      });
    }

    // Verificar que el usuario existe y pertenece a la empresa
    const [usuario] = await db.execute(
      'SELECT id, rol FROM usuarios WHERE id = ? AND empresa_id = ?',
      [usuario_id, empresa_id]
    );

    if (usuario.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado en esta empresa'
      });
    }

    // Verificar que el usuario no es cliente
    if (usuario[0].rol === 'Cliente') {
      return res.status(400).json({
        success: false,
        message: 'No se puede crear personal con un usuario de tipo Cliente'
      });
    }

    // Verificar que no existe personal para este usuario
    const [existingPersonal] = await db.execute(
      'SELECT id FROM personal WHERE usuario_id = ?',
      [usuario_id]
    );

    if (existingPersonal.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un registro de personal para este usuario'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO personal (empresa_id, usuario_id, sucursal_id, calificacion, creado_por)
      VALUES (?, ?, ?, ?, ?)
    `, [empresa_id, usuario_id, sucursal_id, calificacion, creado_por]);

    res.status(201).json({
      success: true,
      message: 'Personal creado exitosamente',
      data: {
        id: result.insertId,
        empresa_id,
        usuario_id,
        sucursal_id
      }
    });
  } catch (error) {
    console.error('Error al crear personal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar personal
const updatePersonal = async (req, res) => {
  try {
    const { id } = req.params;
    const { sucursal_id, estado, calificacion } = req.body;
    const actualizado_por = req.user?.id || 1;

    // Verificar que el personal existe
    const [existingPersonal] = await db.execute('SELECT id FROM personal WHERE id = ?', [id]);
    if (existingPersonal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Personal no encontrado'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (sucursal_id !== undefined) { updateFields.push('sucursal_id = ?'); updateValues.push(sucursal_id); }
    if (estado !== undefined) { updateFields.push('estado = ?'); updateValues.push(estado); }
    if (calificacion !== undefined) { updateFields.push('calificacion = ?'); updateValues.push(calificacion); }

    updateFields.push('actualizado_por = ?');
    updateValues.push(actualizado_por, id);

    if (updateFields.length > 1) {
      await db.execute(
        `UPDATE personal SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    res.json({
      success: true,
      message: 'Personal actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar personal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Asignar especialidad a personal
const asignarEspecialidad = async (req, res) => {
  try {
    const { personal_id } = req.params;
    const { especialidad_id, principal = false } = req.body;

    // Verificar que no existe la asignación
    const [existing] = await db.execute(
      'SELECT id FROM especialidades_personal WHERE personal_id = ? AND especialidad_id = ?',
      [personal_id, especialidad_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Esta especialidad ya está asignada al personal'
      });
    }

    // Si es principal, quitar principal de otras especialidades
    if (principal) {
      await db.execute(
        'UPDATE especialidades_personal SET principal = FALSE WHERE personal_id = ?',
        [personal_id]
      );
    }

    await db.execute(`
      INSERT INTO especialidades_personal (personal_id, especialidad_id, principal)
      VALUES (?, ?, ?)
    `, [personal_id, especialidad_id, principal]);

    res.json({
      success: true,
      message: 'Especialidad asignada exitosamente'
    });
  } catch (error) {
    console.error('Error al asignar especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Asignar servicio a personal
const asignarServicio = async (req, res) => {
  try {
    const { personal_id } = req.params;
    const { servicio_id, principal = false } = req.body;
    const creado_por = req.user?.id || 1;

    // Verificar que no existe la asignación
    const [existing] = await db.execute(
      'SELECT id FROM servicios_personal WHERE personal_id = ? AND servicio_id = ?',
      [personal_id, servicio_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este servicio ya está asignado al personal'
      });
    }

    await db.execute(`
      INSERT INTO servicios_personal (personal_id, servicio_id, principal, creado_por)
      VALUES (?, ?, ?, ?)
    `, [personal_id, servicio_id, principal, creado_por]);

    res.json({
      success: true,
      message: 'Servicio asignado exitosamente'
    });
  } catch (error) {
    console.error('Error al asignar servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear/Actualizar horario de personal
const updateHorario = async (req, res) => {
  try {
    const { personal_id } = req.params;
    const { horarios } = req.body; // Array de horarios
    const creado_por = req.user?.id || 1;

    // Eliminar horarios existentes
    await db.execute('DELETE FROM horarios_personal WHERE personal_id = ?', [personal_id]);

    // Insertar nuevos horarios
    for (const horario of horarios) {
      const { dia, hora_inicio, hora_fin, activo = true, comentario = '' } = horario;

      await db.execute(`
        INSERT INTO horarios_personal (personal_id, dia, hora_inicio, hora_fin, activo, comentario, creado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [personal_id, dia, hora_inicio, hora_fin, activo, comentario, creado_por]);
    }

    res.json({
      success: true,
      message: 'Horarios actualizados exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Remover especialidad de personal
const removerEspecialidad = async (req, res) => {
  try {
    const { personal_id, especialidad_id } = req.params;

    const [result] = await db.execute(
      'DELETE FROM especialidades_personal WHERE personal_id = ? AND especialidad_id = ?',
      [personal_id, especialidad_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación de especialidad no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Especialidad removida exitosamente'
    });
  } catch (error) {
    console.error('Error al remover especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Remover servicio de personal
const removerServicio = async (req, res) => {
  try {
    const { personal_id, servicio_id } = req.params;

    const [result] = await db.execute(
      'DELETE FROM servicios_personal WHERE personal_id = ? AND servicio_id = ?',
      [personal_id, servicio_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación de servicio no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Servicio removido exitosamente'
    });
  } catch (error) {
    console.error('Error al remover servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de personal
const getEstadisticasPersonal = async (req, res) => {
  try {
    const { empresa_id } = req.params;

    const [stats] = await db.execute(`
      SELECT
        COUNT(*) as total_personal,
        COUNT(CASE WHEN p.estado = 0 THEN 1 END) as personal_activo,
        COUNT(CASE WHEN p.estado = 1 THEN 1 END) as personal_inactivo,
        AVG(p.calificacion) as calificacion_promedio,
        COUNT(CASE WHEN u.rol = 'Admin' THEN 1 END) as administradores,
        COUNT(CASE WHEN u.rol = 'Personal' THEN 1 END) as empleados
      FROM personal p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.empresa_id = ?
    `, [empresa_id]);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener personal disponible para un servicio
const getPersonalDisponible = async (req, res) => {
  try {
    const { empresa_id, servicio_id } = req.params;
    const { fecha, hora, sucursal_id } = req.query;

    let whereClause = `
      WHERE p.empresa_id = ?
      AND p.estado = 0
      AND sp.servicio_id = ?
    `;
    const params = [empresa_id, servicio_id];

    if (sucursal_id) {
      whereClause += ' AND p.sucursal_id = ?';
      params.push(sucursal_id);
    }

    const [personal] = await db.execute(`
      SELECT DISTINCT
        p.id,
        p.calificacion,
        u.nombre,
        u.telefono,
        s.nombre as sucursal_nombre
      FROM personal p
      JOIN usuarios u ON p.usuario_id = u.id
      JOIN servicios_personal sp ON p.id = sp.personal_id
      LEFT JOIN sucursales s ON p.sucursal_id = s.id
      ${whereClause}
      ORDER BY p.calificacion DESC, u.nombre
    `, params);

    // Si se especifica fecha y hora, filtrar por disponibilidad
    if (fecha && hora) {
      const personalDisponible = [];

      for (const miembro of personal) {
        const [conflictos] = await db.execute(`
          SELECT COUNT(*) as count
          FROM citas
          WHERE personal_id = ? AND fecha = ? AND hora = ? AND estado NOT IN ('Cancelada')
        `, [miembro.id, fecha, hora]);

        if (conflictos[0].count === 0) {
          personalDisponible.push(miembro);
        }
      }

      return res.json({
        success: true,
        data: personalDisponible
      });
    }

    res.json({
      success: true,
      data: personal
    });
  } catch (error) {
    console.error('Error al obtener personal disponible:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getPersonal,
  getPersonalById,
  createPersonal,
  updatePersonal,
  asignarEspecialidad,
  asignarServicio,
  updateHorario,
  removerEspecialidad,
  removerServicio,
  getEstadisticasPersonal,
  getPersonalDisponible
};
