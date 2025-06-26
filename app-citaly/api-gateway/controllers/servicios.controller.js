const db = require('../config/db');
const logger = require('../logger');

// GET todos los servicios reales (adaptado a la base de datos en español)
const getServicios = async (req, res) => {
  try {
    const empresa_id = req.companyId || req.params.empresa_id || req.query.empresa_id;
    if (!empresa_id) {
      logger.error('Falta el parámetro empresa_id en getServicios');
      return res.status(400).json({ error: 'Falta el parámetro empresa_id' });
    }
    logger.info('Consultando servicios para empresa_id:', empresa_id);
    const [rows] = await db.execute(`
      SELECT s.id, s.nombre AS name, cs.nombre AS category, s.duracion AS duration, s.precio AS price
      FROM servicios s
      LEFT JOIN categorias_servicio cs ON s.categoria_id = cs.id
      WHERE s.empresa_id = ? AND s.estado = 'Activo'
      ORDER BY s.nombre ASC
    `, [empresa_id]);
    logger.info('Respuesta de servicios:', rows);
    res.json(rows);
  } catch (error) {
    logger.error('Error en getServicios:', error);
    res.status(500).json({ error: 'Error al obtener servicios', details: error.message });
  }
};

// POST crear nuevo servicio
const createServicio = async (req, res) => {
  try {
    const { name, description, price, duration, category_id, active } = req.body;

    const query = `
      INSERT INTO services (company_id, name, description, price, duration, category_id, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [req.companyId, name, description, price, duration, category_id, active], (err, results) => {
      if (err) {
        logger.error('Error creating service:', err);
        return res.status(500).json({ error: err.message });
      }

      const newService = {
        id: results.insertId,
        company_id: req.companyId,
        name,
        description,
        price,
        duration,
        category_id,
        active,
        category: null
      };

      res.status(201).json(newService);
    });
  } catch (error) {
    logger.error('Error in createServicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT actualizar servicio
const updateServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, category_id } = req.body;

    const query = `
      UPDATE services
      SET name = ?, description = ?, price = ?, duration = ?, category_id = ?
      WHERE id = ? AND company_id = ?
    `;

    db.query(query, [name, description, price, duration, category_id, id, req.companyId], (err, results) => {
      if (err) {
        logger.error('Error updating service:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }

      res.json({ message: 'Servicio actualizado correctamente' });
    });
  } catch (error) {
    logger.error('Error in updateServicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE eliminar servicio
const deleteServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM services WHERE id = ? AND company_id = ?';

    db.query(query, [id, req.companyId], (err, results) => {
      if (err) {
        logger.error('Error deleting service:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Servicio no encontrado' });
      }

      res.status(204).send();
    });
  } catch (error) {
    logger.error('Error in deleteServicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getServicios,
  createServicio,
  updateServicio,
  deleteServicio
};
