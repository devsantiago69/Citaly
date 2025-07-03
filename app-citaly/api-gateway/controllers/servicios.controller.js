const db = require('../config/db');
const logger = require('../logger');

// GET todos los servicios y categorías
const getServicios = async (req, res) => {
  try {
    const empresa_id = req.companyId || req.params.empresa_id || req.query.empresa_id;
    logger.info(`[SERVICIOS] getServicios - Params:`, { empresa_id });
    if (!empresa_id) {
      logger.error('[SERVICIOS] Falta el parámetro empresa_id en getServicios');
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }
    // Query para servicios
    const serviciosQuery = `
      SELECT s.id, s.nombre AS name, s.descripcion AS description, s.duracion AS duration, s.precio AS price, s.categoria_id, s.estado = 'Activo' AS active, cs.nombre AS category
      FROM servicios s
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      WHERE s.empresa_id = ? AND s.estado = 'Activo'
      ORDER BY s.nombre ASC
    `;
    // Query para categorías (sin color, ya que no existe en la tabla)
    const categoriasQuery = `
      SELECT id, nombre AS name, descripcion AS description
      FROM categorias_servicio
      WHERE empresa_id = ?
      ORDER BY nombre ASC
    `;
    logger.info(`[SERVICIOS] getServicios - Query servicios:`, { serviciosQuery });
    logger.info(`[SERVICIOS] getServicios - Query categorias:`, { categoriasQuery });
    const [servicios] = await db.execute(serviciosQuery, [empresa_id]);
    const [categorias] = await db.execute(categoriasQuery, [empresa_id]);
    res.json({ servicios, categorias });
  } catch (error) {
    logger.error('[SERVICIOS] Error en getServicios:', error);
    res.status(500).json({ error: 'Error al obtener servicios', details: error.message });
  }
};

// POST crear nuevo servicio y retornar servicios y categorías actualizados
const createServicio = async (req, res) => {
  try {
    logger.info('[SERVICIOS] createServicio - Body:', req.body);
    const { name, description, price, duration, category_id, active } = req.body;
    const empresa_id = req.companyId;
    if (!empresa_id) {
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }
    const insertQuery = `
      INSERT INTO servicios (empresa_id, nombre, descripcion, precio, duracion, categoria_id, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    logger.info('[SERVICIOS] createServicio - Query:', { insertQuery });
    await db.execute(insertQuery, [empresa_id, name, description, price, duration, category_id, active ? 'Activo' : 'Inactivo']);
    // Traer servicios y categorías actualizados
    const serviciosQuery = `
      SELECT s.id, s.nombre AS name, s.descripcion AS description, s.duracion AS duration, s.precio AS price, s.categoria_id, s.estado = 'Activo' AS active, cs.nombre AS category
      FROM servicios s
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      WHERE s.empresa_id = ? AND s.estado = 'Activo'
      ORDER BY s.nombre ASC
    `;
    const categoriasQuery = `
      SELECT id, nombre AS name, descripcion AS description
      FROM categorias_servicio
      WHERE empresa_id = ?
      ORDER BY nombre ASC
    `;
    const [servicios] = await db.execute(serviciosQuery, [empresa_id]);
    const [categorias] = await db.execute(categoriasQuery, [empresa_id]);
    res.status(201).json({ servicios, categorias });
  } catch (error) {
    logger.error('[SERVICIOS] Error in createServicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT actualizar servicio
const updateServicio = async (req, res) => {
  try {
    logger.info('[SERVICIOS] updateServicio - Params:', req.params, 'Body:', req.body);
    const { id } = req.params;
    const { name, description, price, duration, category_id } = req.body;
    const query = `
      UPDATE servicios
      SET nombre = ?, descripcion = ?, precio = ?, duracion = ?, categoria_id = ?
      WHERE id = ? AND empresa_id = ?
    `;
    logger.info('[SERVICIOS] updateServicio - Query:', { query });
    db.query(query, [name, description, price, duration, category_id, id, req.companyId], (err, results) => {
      if (err) {
        logger.error('[SERVICIOS] Error updating service:', err);
        return res.status(500).json({ error: err.message });
      }
      logger.info('[SERVICIOS] updateServicio - Result:', results);
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      res.json({ message: 'Servicio actualizado correctamente' });
    });
  } catch (error) {
    logger.error('[SERVICIOS] Error in updateServicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE eliminar servicio
const deleteServicio = async (req, res) => {
  try {
    logger.info('[SERVICIOS] deleteServicio - Params:', req.params);
    const { id } = req.params;
    const query = 'DELETE FROM servicios WHERE id = ? AND empresa_id = ?';
    logger.info('[SERVICIOS] deleteServicio - Query:', { query });
    db.query(query, [id, req.companyId], (err, results) => {
      if (err) {
        logger.error('[SERVICIOS] Error deleting service:', err);
        return res.status(500).json({ error: err.message });
      }
      logger.info('[SERVICIOS] deleteServicio - Result:', results);
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }
      res.status(204).send();
    });
  } catch (error) {
    logger.error('[SERVICIOS] Error in deleteServicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getServicios,
  createServicio,
  updateServicio,
  deleteServicio
};
