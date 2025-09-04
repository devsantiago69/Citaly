const pool = require('../config/db');

const ClienteModel = {
  async getAll({ company_id, page = 1, limit = 10, search = '', estado = '', genero = '', ciudad = '' }) {
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
    const [clientes] = await pool.execute(`
      SELECT c.id, c.nombres, c.apellidos, c.correo_electronico, c.telefono, c.numero_documento, c.estado, c.fecha_creacion,
             c.genero, c.ciudad, c.pais,
             (SELECT COUNT(*) FROM citas ci WHERE ci.cliente_id = c.id) as total_citas,
             (SELECT MAX(ci.fecha) FROM citas ci WHERE ci.cliente_id = c.id) as ultima_cita
      FROM clientes c
      ${whereClause}
      ORDER BY c.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    const [total] = await pool.execute(`SELECT COUNT(*) as count FROM clientes c ${whereClause}`, params);
    return { clientes, total: total[0].count };
  },

  async getById(id, company_id) {
    const [cliente] = await pool.execute(`
      SELECT c.*, e.nombre as empresa_nombre
      FROM clientes c
      LEFT JOIN empresas e ON c.empresa_id = e.id
      WHERE c.id = ? AND c.empresa_id = ?
    `, [id, company_id]);
    return cliente[0];
  },

  async getCitasHistorial(id, company_id) {
    const [citas] = await pool.execute(`
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
    return citas;
  },

  async create(data) {
    const [existing] = await pool.execute(
      'SELECT id FROM clientes WHERE (correo_electronico = ? OR numero_documento = ?) AND empresa_id = ?',
      [data.correo_electronico, data.numero_documento, data.company_id]
    );
    if (existing.length > 0) {
      throw new Error('Ya existe un cliente con este correo o número de documento en la empresa');
    }
    const [result] = await pool.execute(`
      INSERT INTO clientes (empresa_id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero, correo_electronico, telefono, direccion, ciudad, pais, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [data.company_id, data.nombres, data.apellidos, data.tipo_documento, data.numero_documento, data.fecha_nacimiento, data.genero, data.correo_electronico, data.telefono, data.direccion, data.ciudad, data.pais, data.creado_por]);
    const [nuevoCliente] = await pool.execute('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    return nuevoCliente[0];
  },

  async update(id, company_id, data) {
    const [existingCliente] = await pool.execute('SELECT empresa_id FROM clientes WHERE id = ?', [id]);
    if (existingCliente.length === 0) {
      throw new Error('Cliente no encontrado');
    }
    if (data.numero_documento) {
      const [duplicateCliente] = await pool.execute(
        'SELECT id FROM clientes WHERE empresa_id = ? AND tipo_documento = ? AND numero_documento = ? AND id != ?',
        [existingCliente[0].empresa_id, data.tipo_documento, data.numero_documento, id]
      );
      if (duplicateCliente.length > 0) {
        throw new Error('Ya existe otro cliente con este documento en la empresa');
      }
    }
    const result = await pool.execute(`
      UPDATE clientes
      SET nombres = ?, apellidos = ?, tipo_documento = ?, numero_documento = ?,
          fecha_nacimiento = ?, genero = ?, correo_electronico = ?, telefono = ?,
          direccion = ?, ciudad = ?, pais = ?, estado = ?
      WHERE id = ? AND empresa_id = ?
    `, [
      data.nombres, data.apellidos, data.tipo_documento, data.numero_documento, data.fecha_nacimiento,
      data.genero, data.correo_electronico, data.telefono, data.direccion, data.ciudad, data.pais, data.estado,
      id, company_id
    ]);
    return result[0].affectedRows > 0;
  },

  async remove(id, company_id) {
    const [result] = await pool.execute(
      "UPDATE clientes SET estado = 'eliminado' WHERE id = ? AND empresa_id = ?",
      [id, company_id]
    );
    return result.affectedRows > 0;
  },

  async search(company_id, term) {
    const [clientes] = await pool.execute(`
      SELECT id, nombres, apellidos, correo_electronico, numero_documento
      FROM clientes
      WHERE empresa_id = ? AND (nombres LIKE ? OR apellidos LIKE ? OR numero_documento LIKE ?)
      LIMIT 10
    `, [company_id, `%${term}%`, `%${term}%`, `%${term}%`]);
    return clientes;
  },

  async estadisticas(company_id) {
    const [[{ total_clientes }]] = await pool.execute('SELECT COUNT(*) as total_clientes FROM clientes WHERE empresa_id = ?', [company_id]);
    const [[{ nuevos_clientes_mes }]] = await pool.execute('SELECT COUNT(*) as nuevos_clientes_mes FROM clientes WHERE empresa_id = ? AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 1 MONTH)', [company_id]);
    const [[{ clientes_activos }]] = await pool.execute('SELECT COUNT(*) as clientes_activos FROM clientes WHERE empresa_id = ? AND estado = \'activo\'', [company_id]);
    const [distribucion_genero] = await pool.execute('SELECT genero, COUNT(*) as count FROM clientes WHERE empresa_id = ? GROUP BY genero', [company_id]);
    return {
      total_clientes,
      nuevos_clientes_mes,
      clientes_activos,
      distribucion_genero
    };
  }
};

module.exports = ClienteModel;
