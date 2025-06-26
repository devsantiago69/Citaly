const db = require('../config/database');

// Obtener todos los clientes de una empresa
const getClientes = async (req, res) => {
  try {
    const { empresa_id } = req.params;
    const { page = 1, limit = 10, search = '', estado = '' } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE c.empresa_id = ?';
    let params = [empresa_id];

    if (search) {
      whereClause += ' AND (c.nombres LIKE ? OR c.apellidos LIKE ? OR c.correo_electronico LIKE ? OR c.numero_documento LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (estado) {
      whereClause += ' AND c.estado = ?';
      params.push(estado);
    }

    // Obtener clientes con paginación
    const [clientes] = await db.execute(`
      SELECT c.*,
             u.nombre as usuario_nombre,
             uc.nombre as creado_por_nombre,
             ua.nombre as actualizado_por_nombre,
             (SELECT COUNT(*) FROM citas ci WHERE ci.cliente_id = c.id) as total_citas,
             (SELECT MAX(ci.fecha) FROM citas ci WHERE ci.cliente_id = c.id) as ultima_cita
      FROM clientes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN usuarios uc ON c.creado_por = uc.id
      LEFT JOIN usuarios ua ON c.actualizado_por = ua.id
      ${whereClause}
      ORDER BY c.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Obtener total de registros
    const [total] = await db.execute(`
      SELECT COUNT(*) as count
      FROM clientes c
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: clientes,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: total[0].count,
        total_pages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener un cliente específico
const getCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [cliente] = await db.execute(`
      SELECT c.*,
             u.nombre as usuario_nombre,
             uc.nombre as creado_por_nombre,
             ua.nombre as actualizado_por_nombre,
             e.nombre as empresa_nombre
      FROM clientes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN usuarios uc ON c.creado_por = uc.id
      LEFT JOIN usuarios ua ON c.actualizado_por = ua.id
      LEFT JOIN empresas e ON c.empresa_id = e.id
      WHERE c.id = ?
    `, [id]);

    if (cliente.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Obtener historial de citas del cliente
    const [citas] = await db.execute(`
      SELECT ci.*,
             s.nombre as servicio_nombre,
             p.id as personal_id,
             u.nombre as personal_nombre,
             suc.nombre as sucursal_nombre
      FROM citas ci
      LEFT JOIN servicios s ON ci.servicio_id = s.id
      LEFT JOIN personal p ON ci.personal_id = p.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN sucursales suc ON ci.sucursal_id = suc.id
      WHERE ci.cliente_id = ?
      ORDER BY ci.fecha DESC, ci.hora DESC
      LIMIT 10
    `, [id]);

    res.json({
      success: true,
      data: {
        ...cliente[0],
        historial_citas: citas
      }
    });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear nuevo cliente
const createCliente = async (req, res) => {
  try {
    const {
      empresa_id, nombres, apellidos, tipo_documento, numero_documento,
      fecha_nacimiento, genero, correo_electronico, telefono, direccion,
      ciudad, pais = 'Chile'
    } = req.body;

    const creado_por = req.user?.id || 1;

    // Validaciones básicas
    if (!empresa_id || !nombres || !apellidos || !numero_documento || !correo_electronico || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Los campos empresa_id, nombres, apellidos, numero_documento, correo_electronico y telefono son requeridos'
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

    // Verificar que no existe otro cliente con el mismo documento en la empresa
    const [existingCliente] = await db.execute(
      'SELECT id FROM clientes WHERE empresa_id = ? AND tipo_documento = ? AND numero_documento = ?',
      [empresa_id, tipo_documento, numero_documento]
    );

    if (existingCliente.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente con este documento en la empresa'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO clientes
      (empresa_id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento,
       genero, correo_electronico, telefono, direccion, ciudad, pais, creado_por, actualizado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      empresa_id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento,
      genero, correo_electronico, telefono, direccion, ciudad, pais, creado_por, creado_por
    ]);

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: {
        id: result.insertId,
        nombres,
        apellidos,
        correo_electronico,
        telefono
      }
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar cliente
const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento,
      genero, correo_electronico, telefono, direccion, ciudad, pais, estado
    } = req.body;

    const actualizado_por = req.user?.id || 1;

    // Verificar que el cliente existe
    const [existingCliente] = await db.execute('SELECT empresa_id FROM clientes WHERE id = ?', [id]);
    if (existingCliente.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Si se está actualizando el documento, verificar que no exista otro cliente con el mismo
    if (numero_documento) {
      const [duplicateCliente] = await db.execute(
        'SELECT id FROM clientes WHERE empresa_id = ? AND tipo_documento = ? AND numero_documento = ? AND id != ?',
        [existingCliente[0].empresa_id, tipo_documento, numero_documento, id]
      );

      if (duplicateCliente.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro cliente con este documento en la empresa'
        });
      }
    }

    const [result] = await db.execute(`
      UPDATE clientes
      SET nombres = ?, apellidos = ?, tipo_documento = ?, numero_documento = ?,
          fecha_nacimiento = ?, genero = ?, correo_electronico = ?, telefono = ?,
          direccion = ?, ciudad = ?, pais = ?, estado = ?, actualizado_por = ?
      WHERE id = ?
    `, [
      nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento,
      genero, correo_electronico, telefono, direccion, ciudad, pais, estado,
      actualizado_por, id
    ]);

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar cliente (cambiar estado a inactivo)
const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado_por = req.user?.id || 1;

    // Verificar que el cliente existe
    const [existingCliente] = await db.execute('SELECT id FROM clientes WHERE id = ?', [id]);
    if (existingCliente.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Cambiar estado a inactivo en lugar de eliminar
    await db.execute(
      'UPDATE clientes SET estado = "Inactivo", actualizado_por = ? WHERE id = ?',
      [actualizado_por, id]
    );

    res.json({
      success: true,
      message: 'Cliente desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de clientes
const getEstadisticasClientes = async (req, res) => {
  try {
    const { empresa_id } = req.params;

    const [stats] = await db.execute(`
      SELECT
        COUNT(*) as total_clientes,
        COUNT(CASE WHEN estado = 'Activo' THEN 1 END) as clientes_activos,
        COUNT(CASE WHEN estado = 'Inactivo' THEN 1 END) as clientes_inactivos,
        COUNT(CASE WHEN DATE(fecha_creacion) = CURDATE() THEN 1 END) as nuevos_hoy,
        COUNT(CASE WHEN MONTH(fecha_creacion) = MONTH(CURRENT_DATE) THEN 1 END) as nuevos_mes,
        COUNT(CASE WHEN genero = 'Masculino' THEN 1 END) as masculinos,
        COUNT(CASE WHEN genero = 'Femenino' THEN 1 END) as femeninos
      FROM clientes
      WHERE empresa_id = ?
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

// Buscar clientes por término
const searchClientes = async (req, res) => {
  try {
    const { empresa_id } = req.params;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Parámetro de búsqueda requerido'
      });
    }

    const [clientes] = await db.execute(`
      SELECT id, nombres, apellidos, correo_electronico, telefono, numero_documento
      FROM clientes
      WHERE empresa_id = ?
      AND (nombres LIKE ? OR apellidos LIKE ? OR correo_electronico LIKE ? OR numero_documento LIKE ?)
      AND estado = 'Activo'
      ORDER BY nombres, apellidos
      LIMIT 20
    `, [empresa_id, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);

    res.json({
      success: true,
      data: clientes
    });
  } catch (error) {
    console.error('Error en búsqueda de clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  getEstadisticasClientes,
  searchClientes
};
