// Controlador de clientes: gestión completa y compatible con frontend
const db = require('../config/db');

// Obtener todos los clientes de una empresa (paginado, búsqueda, filtros y datos enriquecidos)
const getClientes = async (req, res) => {
  try {
    const { company_id } = req.user; // Utilizar company_id del token
    const { page = 1, limit = 10, search = '', estado = '', genero = '', ciudad = '' } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE c.empresa_id = ?';
    let params = [company_id];
    if (search) {
      whereClause += ' AND (c.nombres LIKE ? OR c.apellidos LIKE ? OR c.correo_electronico LIKE ? OR c.numero_documento LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    if (estado) {
      whereClause += ' AND c.estado = ?';
      params.push(estado);
    }
    if (genero) {
      whereClause += ' AND c.genero = ?';
      params.push(genero);
    }
    if (ciudad) {
      whereClause += ' AND c.ciudad = ?';
      params.push(ciudad);
    }
    const [clientes] = await db.execute(`
      SELECT c.id, c.nombres, c.apellidos, c.correo_electronico, c.telefono, c.numero_documento, c.estado, c.fecha_creacion,
             c.genero, c.ciudad, c.pais,
             (SELECT COUNT(*) FROM citas ci WHERE ci.cliente_id = c.id) as total_citas,
             (SELECT MAX(ci.fecha) FROM citas ci WHERE ci.cliente_id = c.id) as ultima_cita
      FROM clientes c
      ${whereClause}
      ORDER BY c.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    const [total] = await db.execute(`SELECT COUNT(*) as count FROM clientes c ${whereClause}`, params);
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
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

// Obtener un cliente específico y su historial de citas
const getCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user; // Utilizar company_id del token
    const [cliente] = await db.execute(`
      SELECT c.*, e.nombre as empresa_nombre
      FROM clientes c
      LEFT JOIN empresas e ON c.empresa_id = e.id
      WHERE c.id = ? AND c.empresa_id = ?
    `, [id, company_id]);
    if (cliente.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    const [citas] = await db.execute(`
      SELECT ci.id, ci.fecha, ci.hora, ci.estado, ci.notas,
             s.id as servicio_id, s.nombre as servicio_nombre, s.duracion, s.precio,
             p.id as personal_id, u.nombre as personal_nombre, suc.nombre as sucursal_nombre
      FROM citas ci
      LEFT JOIN servicios s ON ci.servicio_id = s.id
      LEFT JOIN personal p ON ci.personal_id = p.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN sucursales suc ON ci.sucursal_id = suc.id
      WHERE ci.cliente_id = ? AND ci.empresa_id = ?
      ORDER BY ci.fecha DESC, ci.hora DESC
      LIMIT 10
    `, [id, company_id]);
    res.json({
      success: true,
      data: { ...cliente[0], historial_citas: citas }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

// Crear nuevo cliente
const createCliente = async (req, res) => {
  try {
    const {
      nombres, apellidos, tipo_documento, numero_documento,
      fecha_nacimiento, genero, correo_electronico, telefono, direccion,
      ciudad, pais = 'Chile'
    } = req.body;
    const { company_id, id: creado_por } = req.user; // Utilizar company_id e id del token

    if (!nombres || !apellidos || !numero_documento || !correo_electronico || !telefono) {
      return res.status(400).json({ success: false, message: 'Los campos nombres, apellidos, numero_documento, correo_electronico y telefono son requeridos' });
    }
    const [existing] = await db.execute(
      'SELECT id FROM clientes WHERE (correo_electronico = ? OR numero_documento = ?) AND empresa_id = ?',
      [correo_electronico, numero_documento, company_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Ya existe un cliente con este correo o número de documento en la empresa' });
    }
    const [result] = await db.execute(`
      INSERT INTO clientes (empresa_id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero, correo_electronico, telefono, direccion, ciudad, pais, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [company_id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero, correo_electronico, telefono, direccion, ciudad, pais, creado_por]);
    const [nuevoCliente] = await db.execute('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: nuevoCliente
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

// Actualizar cliente
const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user; // Utilizar company_id del token
    const {
      nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento,
      genero, correo_electronico, telefono, direccion, ciudad, pais, estado
    } = req.body;
    const actualizado_por = req.user?.id || 1;
    const [existingCliente] = await db.execute('SELECT empresa_id FROM clientes WHERE id = ?', [id]);
    if (existingCliente.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    if (numero_documento) {
      const [duplicateCliente] = await db.execute(
        'SELECT id FROM clientes WHERE empresa_id = ? AND tipo_documento = ? AND numero_documento = ? AND id != ?',
        [existingCliente[0].empresa_id, tipo_documento, numero_documento, id]
      );
      if (duplicateCliente.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe otro cliente con este documento en la empresa' });
      }
    }
    const result = await db.execute(`
      UPDATE clientes
      SET nombres = ?, apellidos = ?, tipo_documento = ?, numero_documento = ?,
          fecha_nacimiento = ?, genero = ?, correo_electronico = ?, telefono = ?,
          direccion = ?, ciudad = ?, pais = ?, estado = ?
      WHERE id = ? AND empresa_id = ?
    `, [
      nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento,
      genero, correo_electronico, telefono, direccion, ciudad, pais, estado,
      id, company_id
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado o ya actualizado' });
    }
    res.json({ success: true, message: 'Cliente actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

// Eliminar cliente (soft delete)
const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user; // Utilizar company_id del token
    const [result] = await db.execute(
      'UPDATE clientes SET estado = \'eliminado\' WHERE id = ? AND empresa_id = ?',
      [id, company_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    res.json({ success: true, message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

// Buscar clientes (autocompletado)
const searchClientes = async (req, res) => {
  try {
    const { company_id } = req.user; // Utilizar company_id del token
    const { term } = req.query;
    if (!term) {
      return res.status(400).json({ success: false, message: 'Parámetro de búsqueda requerido' });
    }
    const [clientes] = await db.execute(`
      SELECT id, nombres, apellidos, correo_electronico, numero_documento
      FROM clientes
      WHERE empresa_id = ? AND (nombres LIKE ? OR apellidos LIKE ? OR numero_documento LIKE ?)
      LIMIT 10
    `, [company_id, `%${term}%`, `%${term}%`, `%${term}%`]);
    res.json({ success: true, data: clientes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

// Obtener estadísticas de clientes
const getEstadisticasClientes = async (req, res) => {
  try {
    const { company_id } = req.user; // Utilizar company_id del token
    const [[{ total_clientes }]] = await db.execute('SELECT COUNT(*) as total_clientes FROM clientes WHERE empresa_id = ?', [company_id]);
    const [[{ nuevos_clientes_mes }]] = await db.execute('SELECT COUNT(*) as nuevos_clientes_mes FROM clientes WHERE empresa_id = ? AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 1 MONTH)', [company_id]);
    const [[{ clientes_activos }]] = await db.execute('SELECT COUNT(*) as clientes_activos FROM clientes WHERE empresa_id = ? AND estado = \'activo\'', [company_id]);
    const [distribucion_genero] = await db.execute('SELECT genero, COUNT(*) as count FROM clientes WHERE empresa_id = ? GROUP BY genero', [company_id]);
    res.json({
      success: true,
      data: {
        total_clientes,
        nuevos_clientes_mes,
        clientes_activos,
        distribucion_genero
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
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
