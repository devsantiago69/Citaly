const db = require('../config/db');
const logger = require('../logger');

// GET todos los servicios de una empresa
const getServicios = async (req, res) => {
  try {
    const { empresa_id } = req.params;
    const { categoria_id, estado, sucursal_id, page = 1, limit = 20 } = req.query;

    logger.info('GET /api/services - Request received', {
      empresa_id,
      categoria_id,
      estado,
      sucursal_id
    });

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE s.empresa_id = ?';
    const queryParams = [empresa_id];

    if (categoria_id) {
      whereClause += ' AND s.categoria_id = ?';
      queryParams.push(categoria_id);
    }

    if (estado !== '') {
      whereClause += ' AND s.estado = ?';
      queryParams.push(estado);
    }

    let joinClause = '';
    if (sucursal_id) {
      joinClause = 'JOIN servicios_sucursal ss ON s.id = ss.servicio_id';
      whereClause += ' AND ss.sucursal_id = ? AND ss.estado = "Activo"';
      queryParams.push(sucursal_id);
    }

    const query = `
      SELECT
        s.*,
        cs.nombre as categoria_nombre,
        cs.descripcion as categoria_descripcion,
        uc.nombre as creado_por_nombre,
        (SELECT COUNT(*) FROM servicios_personal sp WHERE sp.servicio_id = s.id) as personal_asignado,
        (SELECT COUNT(*) FROM citas c WHERE c.servicio_id = s.id) as total_citas,
        ${sucursal_id ? 'ss.precio as precio_sucursal,' : ''}
        CASE
          WHEN s.estado = 0 THEN 'Activo'
          ELSE 'Inactivo'
        END as estado_texto
      FROM servicios s
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      LEFT JOIN usuarios uc ON s.creado_por = uc.id
      ${joinClause}
      ${whereClause}
      ORDER BY cs.nombre, s.nombre
      LIMIT ? OFFSET ?
    `;

    const [servicios] = await db.execute(query, [...queryParams, parseInt(limit), offset]);

    // Obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM servicios s
      ${joinClause}
      ${whereClause}
    `;
    const [totalResults] = await db.execute(countQuery, queryParams);

    res.json({
      success: true,
      data: servicios,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: totalResults[0].total,
        total_pages: Math.ceil(totalResults[0].total / limit)
      }
    });
  } catch (error) {
    logger.error('Error in getServicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET servicio por ID
const getServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const [servicio] = await db.execute(`
      SELECT
        s.*,
        cs.nombre as categoria_nombre,
        cs.descripcion as categoria_descripcion,
        e.nombre as empresa_nombre,
        uc.nombre as creado_por_nombre,
        ua.nombre as actualizado_por_nombre
      FROM servicios s
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      LEFT JOIN empresas e ON s.empresa_id = e.id
      LEFT JOIN usuarios uc ON s.creado_por = uc.id
      LEFT JOIN usuarios ua ON s.actualizado_por = ua.id
      WHERE s.id = ?
    `, [id]);

    if (servicio.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Obtener sucursales donde está disponible el servicio
    const [sucursales] = await db.execute(`
      SELECT
        ss.*,
        suc.nombre as sucursal_nombre,
        suc.direccion as sucursal_direccion
      FROM servicios_sucursal ss
      JOIN sucursales suc ON ss.sucursal_id = suc.id
      WHERE ss.servicio_id = ?
      ORDER BY suc.nombre
    `, [id]);

    // Obtener personal que puede realizar el servicio
    const [personal] = await db.execute(`
      SELECT
        sp.*,
        u.nombre as personal_nombre,
        p.calificacion,
        suc.nombre as sucursal_nombre
      FROM servicios_personal sp
      JOIN personal p ON sp.personal_id = p.id
      JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN sucursales suc ON p.sucursal_id = suc.id
      WHERE sp.servicio_id = ?
      ORDER BY sp.principal DESC, u.nombre
    `, [id]);

    res.json({
      success: true,
      data: {
        ...servicio[0],
        sucursales_disponibles: sucursales,
        personal_asignado: personal
      }
    });
  } catch (error) {
    logger.error('Error in getServicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// POST crear nuevo servicio
const createServicio = async (req, res) => {
  try {
    const {
      empresa_id, categoria_id, nombre, descripcion, duracion, precio
    } = req.body;

    const creado_por = req.user?.id || 1;

    // Validaciones básicas
    if (!empresa_id || !nombre || !duracion || !precio) {
      return res.status(400).json({
        success: false,
        message: 'Los campos empresa_id, nombre, duracion y precio son requeridos'
      });
    }

    // Verificar que la empresa existe
    const [empresa] = await db.execute('SELECT id FROM empresas WHERE id = ?', [empresa_id]);
    if (empresa.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada'
      });
    }

    // Verificar que la categoría existe (si se proporciona)
    if (categoria_id) {
      const [categoria] = await db.execute(
        'SELECT id FROM categorias_servicio WHERE id = ? AND empresa_id = ?',
        [categoria_id, empresa_id]
      );
      if (categoria.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada en esta empresa'
        });
      }
    }

    const [result] = await db.execute(`
      INSERT INTO servicios (empresa_id, categoria_id, nombre, descripcion, duracion, precio, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [empresa_id, categoria_id, nombre, descripcion, duracion, precio, creado_por]);

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: {
        id: result.insertId,
        nombre,
        duracion,
        precio
      }
    });
  } catch (error) {
    logger.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// PUT actualizar servicio
const updateServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria_id, nombre, descripcion, duracion, precio, estado } = req.body;
    const actualizado_por = req.user?.id || 1;

    // Verificar que el servicio existe
    const [existingServicio] = await db.execute('SELECT * FROM servicios WHERE id = ?', [id]);
    if (existingServicio.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Verificar categoría si se proporciona
    if (categoria_id) {
      const [categoria] = await db.execute(
        'SELECT id FROM categorias_servicio WHERE id = ? AND empresa_id = ?',
        [categoria_id, existingServicio[0].empresa_id]
      );
      if (categoria.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada en esta empresa'
        });
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (categoria_id) { updateFields.push('categoria_id = ?'); updateValues.push(categoria_id); }
    if (nombre) { updateFields.push('nombre = ?'); updateValues.push(nombre); }
    if (descripcion !== undefined) { updateFields.push('descripcion = ?'); updateValues.push(descripcion); }
    if (duracion) { updateFields.push('duracion = ?'); updateValues.push(duracion); }
    if (precio) { updateFields.push('precio = ?'); updateValues.push(precio); }
    if (estado !== undefined) { updateFields.push('estado = ?'); updateValues.push(estado); }

    updateFields.push('actualizado_por = ?');
    updateValues.push(actualizado_por, id);

    if (updateFields.length > 1) {
      await db.execute(
        `UPDATE servicios SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    res.json({
      success: true,
      message: 'Servicio actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// DELETE eliminar servicio (cambiar estado)
const deleteServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado_por = req.user?.id || 1;

    // Verificar que el servicio existe
    const [existingServicio] = await db.execute('SELECT id FROM servicios WHERE id = ?', [id]);
    if (existingServicio.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Verificar que no hay citas programadas
    const [citasActivas] = await db.execute(
      'SELECT COUNT(*) as count FROM citas WHERE servicio_id = ? AND estado IN ("Programada", "Confirmada")',
      [id]
    );

    if (citasActivas[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el servicio porque tiene citas programadas'
      });
    }

    // Cambiar estado a inactivo
    await db.execute(
      'UPDATE servicios SET estado = 1, actualizado_por = ? WHERE id = ?',
      [actualizado_por, id]
    );

    res.json({
      success: true,
      message: 'Servicio desactivado exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// POST asignar servicio a sucursal
const asignarServicioASucursal = async (req, res) => {
  try {
    const { servicio_id, sucursal_id, precio } = req.body;
    const creado_por = req.user?.id || 1;

    // Verificar que no existe la asignación
    const [existing] = await db.execute(
      'SELECT id FROM servicios_sucursal WHERE servicio_id = ? AND sucursal_id = ?',
      [servicio_id, sucursal_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El servicio ya está asignado a esta sucursal'
      });
    }

    await db.execute(`
      INSERT INTO servicios_sucursal (sucursal_id, servicio_id, precio, creado_por)
      VALUES (?, ?, ?, ?)
    `, [sucursal_id, servicio_id, precio, creado_por]);

    res.json({
      success: true,
      message: 'Servicio asignado a sucursal exitosamente'
    });
  } catch (error) {
    logger.error('Error assigning service to branch:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// PUT actualizar precio de servicio en sucursal
const actualizarPrecioEnSucursal = async (req, res) => {
  try {
    const { servicio_id, sucursal_id } = req.params;
    const { precio } = req.body;
    const actualizado_por = req.user?.id || 1;

    const [result] = await db.execute(`
      UPDATE servicios_sucursal
      SET precio = ?, actualizado_por = ?
      WHERE servicio_id = ? AND sucursal_id = ?
    `, [precio, actualizado_por, servicio_id, sucursal_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asignación de servicio a sucursal no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Precio actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error updating service price:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET categorías de servicio
const getCategorias = async (req, res) => {
  try {
    const { empresa_id } = req.params;

    const [categorias] = await db.execute(`
      SELECT
        cs.*,
        uc.nombre as creado_por_nombre,
        (SELECT COUNT(*) FROM servicios s WHERE s.categoria_id = cs.id AND s.estado = 0) as servicios_activos
      FROM categorias_servicio cs
      LEFT JOIN usuarios uc ON cs.creado_por = uc.id
      WHERE cs.empresa_id = ?
      ORDER BY cs.nombre
    `, [empresa_id]);

    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    logger.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// POST crear categoría
const createCategoria = async (req, res) => {
  try {
    const { empresa_id, nombre, descripcion } = req.body;
    const creado_por = req.user?.id || 1;

    if (!empresa_id || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Los campos empresa_id y nombre son requeridos'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO categorias_servicio (empresa_id, nombre, descripcion, creado_por)
      VALUES (?, ?, ?, ?)
    `, [empresa_id, nombre, descripcion, creado_por]);

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: {
        id: result.insertId,
        nombre
      }
    });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// GET estadísticas de servicios
const getEstadisticasServicios = async (req, res) => {
  try {
    const { empresa_id } = req.params;

    const [stats] = await db.execute(`
      SELECT
        COUNT(*) as total_servicios,
        COUNT(CASE WHEN estado = 0 THEN 1 END) as servicios_activos,
        COUNT(CASE WHEN estado = 1 THEN 1 END) as servicios_inactivos,
        AVG(precio) as precio_promedio,
        AVG(duracion) as duracion_promedio,
        COUNT(DISTINCT categoria_id) as total_categorias
      FROM servicios
      WHERE empresa_id = ?
    `, [empresa_id]);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    logger.error('Error getting service stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getServicios,
  getServicio,
  createServicio,
  updateServicio,
  deleteServicio,
  asignarServicioASucursal,
  actualizarPrecioEnSucursal,
  getCategorias,
  createCategoria,
  getEstadisticasServicios
};
