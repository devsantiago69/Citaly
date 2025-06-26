const { db } = require('../config/db');
const logger = require('../logger');

// GET todos los casos de soporte
const getSupportCases = async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        subject,
        description,
        priority,
        status,
        created_at as createdAt
      FROM support_cases
      WHERE company_id = ?
      ORDER BY created_at DESC
    `;

    db.query(query, [req.companyId], (err, results) => {
      if (err) {
        logger.error('Error fetching support cases:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  } catch (error) {
    logger.error('Error in getSupportCases:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST crear nuevo caso de soporte
const createSupportCase = async (req, res) => {
  try {
    const { subject, description, priority = 'medium', client_id, created_by = 1 } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject y description son requeridos' });
    }

    const query = `
      INSERT INTO support_cases (company_id, subject, description, priority, client_id, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'open', ?)
    `;

    db.query(query, [req.companyId, subject, description, priority, client_id, created_by], (err, results) => {
      if (err) {
        logger.error('Error creating support case:', err);
        return res.status(500).json({ error: err.message });
      }

      const newCase = {
        id: results.insertId,
        company_id: req.companyId,
        subject,
        description,
        priority,
        client_id,
        status: 'open',
        created_by,
        createdAt: new Date().toISOString()
      };

      res.status(201).json(newCase);
    });
  } catch (error) {
    logger.error('Error in createSupportCase:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT actualizar caso de soporte
const updateSupportCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, description, priority, status, assigned_to } = req.body;

    const query = `
      UPDATE support_cases
      SET subject = ?, description = ?, priority = ?, status = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `;

    db.query(query, [subject, description, priority, status, assigned_to, id, req.companyId], (err, results) => {
      if (err) {
        logger.error('Error updating support case:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Caso de soporte no encontrado' });
      }

      res.json({ message: 'Caso de soporte actualizado correctamente' });
    });
  } catch (error) {
    logger.error('Error in updateSupportCase:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE eliminar caso de soporte
const deleteSupportCase = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM support_cases WHERE id = ? AND company_id = ?';

    db.query(query, [id, req.companyId], (err, results) => {
      if (err) {
        logger.error('Error deleting support case:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Caso de soporte no encontrado' });
      }

      res.status(204).send();
    });
  } catch (error) {
    logger.error('Error in deleteSupportCase:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET estadísticas de casos de soporte
const getSupportStats = async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(*) as total_cases,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_cases,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_cases,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_cases,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_cases,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority
      FROM support_cases
      WHERE company_id = ?
    `;

    db.query(query, [req.companyId], (err, results) => {
      if (err) {
        logger.error('Error fetching support stats:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results[0]);
    });
  } catch (error) {
    logger.error('Error in getSupportStats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getSupportCases,
  createSupportCase,
  updateSupportCase,
  deleteSupportCase,
  getSupportStats
};
