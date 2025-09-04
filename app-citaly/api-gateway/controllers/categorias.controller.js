const db = require('../config/db');
const logger = require('../logger');

// GET todas las categorías por empresa
const getAll = async (req, res) => {
  try {
    const empresa_id = req.companyId || req.params.empresa_id || req.query.empresa_id;
    
    logger.info(`[CATEGORIAS] getAll - Params:`, { empresa_id });
    
    if (!empresa_id) {
      logger.error('[CATEGORIAS] Falta el parámetro empresa_id en getAll');
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }

    const query = `
      SELECT 
        id, 
        empresa_id,
        nombre,
        descripcion,
        fecha_creacion,
        creado_por,
        actualizado_por
      FROM categorias_servicio 
      WHERE empresa_id = ? 
      ORDER BY nombre ASC
    `;

    logger.info(`[CATEGORIAS] getAll - Query:`, { query, empresa_id });

    const [categorias] = await db.execute(query, [empresa_id]);

    logger.info(`[CATEGORIAS] getAll - Resultado:`, { 
      count: categorias.length,
      empresa_id 
    });

    res.json(categorias);
  } catch (error) {
    logger.error('[CATEGORIAS] Error en getAll:', error);
    res.status(500).json({ 
      error: 'Error al obtener categorías', 
      details: error.message 
    });
  }
};

// GET categoría por ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const empresa_id = req.companyId;

    logger.info(`[CATEGORIAS] getById - Params:`, { id, empresa_id });

    if (!empresa_id) {
      logger.error('[CATEGORIAS] Falta el parámetro empresa_id en getById');
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }

    const query = `
      SELECT 
        id, 
        empresa_id,
        nombre,
        descripcion,
        fecha_creacion,
        creado_por,
        actualizado_por
      FROM categorias_servicio 
      WHERE id = ? AND empresa_id = ?
    `;

    const [categorias] = await db.execute(query, [id, empresa_id]);

    if (categorias.length === 0) {
      logger.warn(`[CATEGORIAS] Categoría no encontrada:`, { id, empresa_id });
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    logger.info(`[CATEGORIAS] getById - Categoría encontrada:`, categorias[0]);

    res.json(categorias[0]);
  } catch (error) {
    logger.error('[CATEGORIAS] Error en getById:', error);
    res.status(500).json({ 
      error: 'Error al obtener categoría', 
      details: error.message 
    });
  }
};

// POST crear nueva categoría
const create = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const empresa_id = req.companyId;
    const creado_por = req.userId || 1; // ID del usuario que crea

    logger.info(`[CATEGORIAS] create - Body:`, { 
      nombre, 
      descripcion, 
      empresa_id, 
      creado_por 
    });

    if (!empresa_id) {
      logger.error('[CATEGORIAS] Falta el parámetro empresa_id en create');
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    // Verificar si ya existe una categoría con el mismo nombre en la empresa
    const checkQuery = `
      SELECT id FROM categorias_servicio 
      WHERE empresa_id = ? AND LOWER(nombre) = LOWER(?)
    `;

    const [existing] = await db.execute(checkQuery, [empresa_id, nombre.trim()]);

    if (existing.length > 0) {
      logger.warn(`[CATEGORIAS] Categoría ya existe:`, { nombre, empresa_id });
      return res.status(409).json({ 
        error: 'Ya existe una categoría con ese nombre en esta empresa' 
      });
    }

    const insertQuery = `
      INSERT INTO categorias_servicio 
      (empresa_id, nombre, descripcion, creado_por) 
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.execute(insertQuery, [
      empresa_id, 
      nombre.trim(), 
      descripcion?.trim() || null, 
      creado_por
    ]);

    const nuevaCategoria = {
      id: result.insertId,
      empresa_id,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      creado_por,
      fecha_creacion: new Date()
    };

    logger.info(`[CATEGORIAS] create - Categoría creada:`, nuevaCategoria);

    res.status(201).json(nuevaCategoria);
  } catch (error) {
    logger.error('[CATEGORIAS] Error en create:', error);
    res.status(500).json({ 
      error: 'Error al crear categoría', 
      details: error.message 
    });
  }
};

// PUT actualizar categoría
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    const empresa_id = req.companyId;
    const actualizado_por = req.userId || 1;

    logger.info(`[CATEGORIAS] update - Params:`, { 
      id, 
      nombre, 
      descripcion, 
      empresa_id, 
      actualizado_por 
    });

    if (!empresa_id) {
      logger.error('[CATEGORIAS] Falta el parámetro empresa_id en update');
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    // Verificar que la categoría existe y pertenece a la empresa
    const checkQuery = `
      SELECT id FROM categorias_servicio 
      WHERE id = ? AND empresa_id = ?
    `;

    const [existing] = await db.execute(checkQuery, [id, empresa_id]);

    if (existing.length === 0) {
      logger.warn(`[CATEGORIAS] Categoría no encontrada para actualizar:`, { id, empresa_id });
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Verificar si ya existe otra categoría con el mismo nombre
    const duplicateQuery = `
      SELECT id FROM categorias_servicio 
      WHERE empresa_id = ? AND LOWER(nombre) = LOWER(?) AND id != ?
    `;

    const [duplicate] = await db.execute(duplicateQuery, [empresa_id, nombre.trim(), id]);

    if (duplicate.length > 0) {
      logger.warn(`[CATEGORIAS] Nombre duplicado al actualizar:`, { nombre, empresa_id, id });
      return res.status(409).json({ 
        error: 'Ya existe otra categoría con ese nombre en esta empresa' 
      });
    }

    const updateQuery = `
      UPDATE categorias_servicio 
      SET nombre = ?, descripcion = ?, actualizado_por = ?
      WHERE id = ? AND empresa_id = ?
    `;

    await db.execute(updateQuery, [
      nombre.trim(), 
      descripcion?.trim() || null, 
      actualizado_por, 
      id, 
      empresa_id
    ]);

    // Obtener la categoría actualizada
    const getQuery = `
      SELECT 
        id, 
        empresa_id,
        nombre,
        descripcion,
        fecha_creacion,
        creado_por,
        actualizado_por
      FROM categorias_servicio 
      WHERE id = ? AND empresa_id = ?
    `;

    const [updated] = await db.execute(getQuery, [id, empresa_id]);

    logger.info(`[CATEGORIAS] update - Categoría actualizada:`, updated[0]);

    res.json(updated[0]);
  } catch (error) {
    logger.error('[CATEGORIAS] Error en update:', error);
    res.status(500).json({ 
      error: 'Error al actualizar categoría', 
      details: error.message 
    });
  }
};

// DELETE eliminar categoría
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const empresa_id = req.companyId;

    logger.info(`[CATEGORIAS] remove - Params:`, { id, empresa_id });

    if (!empresa_id) {
      logger.error('[CATEGORIAS] Falta el parámetro empresa_id en remove');
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }

    // Verificar que la categoría existe y pertenece a la empresa
    const checkQuery = `
      SELECT id FROM categorias_servicio 
      WHERE id = ? AND empresa_id = ?
    `;

    const [existing] = await db.execute(checkQuery, [id, empresa_id]);

    if (existing.length === 0) {
      logger.warn(`[CATEGORIAS] Categoría no encontrada para eliminar:`, { id, empresa_id });
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Verificar si hay servicios asociados a esta categoría
    const servicesQuery = `
      SELECT COUNT(*) as count FROM servicios 
      WHERE categoria_id = ? AND empresa_id = ?
    `;

    const [services] = await db.execute(servicesQuery, [id, empresa_id]);

    if (services[0].count > 0) {
      logger.warn(`[CATEGORIAS] No se puede eliminar categoría con servicios:`, { 
        id, 
        empresa_id, 
        serviciosCount: services[0].count 
      });
      return res.status(409).json({ 
        error: 'No se puede eliminar la categoría porque tiene servicios asociados',
        serviciosCount: services[0].count
      });
    }

    const deleteQuery = `
      DELETE FROM categorias_servicio 
      WHERE id = ? AND empresa_id = ?
    `;

    await db.execute(deleteQuery, [id, empresa_id]);

    logger.info(`[CATEGORIAS] remove - Categoría eliminada:`, { id, empresa_id });

    res.json({ 
      message: 'Categoría eliminada correctamente',
      id: parseInt(id)
    });
  } catch (error) {
    logger.error('[CATEGORIAS] Error en remove:', error);
    res.status(500).json({ 
      error: 'Error al eliminar categoría', 
      details: error.message 
    });
  }
};

// GET especialidades de una categoría
const getEspecialidades = async (req, res) => {
  try {
    const { id } = req.params;
    const empresa_id = req.companyId;

    logger.info(`[CATEGORIAS] getEspecialidades - Params:`, { id, empresa_id });

    if (!empresa_id) {
      logger.error('[CATEGORIAS] Falta el parámetro empresa_id en getEspecialidades');
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }

    // Verificar que la categoría existe
    const checkQuery = `
      SELECT id, nombre FROM categorias_servicio 
      WHERE id = ? AND empresa_id = ?
    `;

    const [categoria] = await db.execute(checkQuery, [id, empresa_id]);

    if (categoria.length === 0) {
      logger.warn(`[CATEGORIAS] Categoría no encontrada para especialidades:`, { id, empresa_id });
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Obtener servicios (especialidades) de la categoría
    const servicesQuery = `
      SELECT 
        id,
        nombre,
        descripcion,
        duracion,
        precio,
        estado,
        fecha_creacion
      FROM servicios 
      WHERE categoria_id = ? AND empresa_id = ?
      ORDER BY nombre ASC
    `;

    const [servicios] = await db.execute(servicesQuery, [id, empresa_id]);

    logger.info(`[CATEGORIAS] getEspecialidades - Resultado:`, { 
      categoria: categoria[0].nombre,
      serviciosCount: servicios.length 
    });

    res.json({
      categoria: categoria[0],
      especialidades: servicios
    });
  } catch (error) {
    logger.error('[CATEGORIAS] Error en getEspecialidades:', error);
    res.status(500).json({ 
      error: 'Error al obtener especialidades de la categoría', 
      details: error.message 
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getEspecialidades
};
