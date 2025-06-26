const { db } = require('../config/db');
const logger = require('../logger');

// GET todos los tipos de usuario
const getUserTypes = async (req, res) => {
  try {
    const { company_id = req.companyId || 1 } = req.query;

    const query = `
      SELECT
        ut.id,
        ut.company_id,
        ut.name,
        ut.description,
        ut.permissions,
        ut.level,
        ut.active,
        ut.created_at as createdAt,
        ut.updated_at as updatedAt,
        u.name as createdByName
      FROM user_types ut
      LEFT JOIN users u ON ut.created_by = u.id
      WHERE ut.company_id = ? AND ut.active = 1
      ORDER BY ut.level, ut.name
    `;

    db.execute(query, [company_id], (err, results) => {
      if (err) {
        logger.error('Error fetching user types:', err);
        res.status(500).json({ error: 'Error fetching user types' });
        return;
      }

      // Parse JSON permissions
      const userTypes = results.map(userType => ({
        ...userType,
        permissions: typeof userType.permissions === 'string'
          ? JSON.parse(userType.permissions)
          : userType.permissions
      }));

      res.json(userTypes);
    });
  } catch (error) {
    logger.error('Error in getUserTypes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET tipo de usuario por ID
const getUserTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        ut.id,
        ut.company_id,
        ut.name,
        ut.description,
        ut.permissions,
        ut.level,
        ut.active,
        ut.created_at as createdAt,
        ut.updated_at as updatedAt,
        u.name as createdByName
      FROM user_types ut
      LEFT JOIN users u ON ut.created_by = u.id
      WHERE ut.id = ?
    `;

    db.execute(query, [id], (err, results) => {
      if (err) {
        logger.error('Error fetching user type:', err);
        res.status(500).json({ error: 'Error fetching user type' });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: 'User type not found' });
        return;
      }

      const userType = {
        ...results[0],
        permissions: typeof results[0].permissions === 'string'
          ? JSON.parse(results[0].permissions)
          : results[0].permissions
      };

      res.json(userType);
    });
  } catch (error) {
    logger.error('Error in getUserTypeById:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST crear nuevo tipo de usuario
const createUserType = async (req, res) => {
  try {
    const {
      company_id = req.companyId || 1,
      name,
      description,
      permissions = {},
      level,
      created_by = 1
    } = req.body;

    if (!name || !level) {
      return res.status(400).json({ error: 'Name and level are required' });
    }

    if (!['admin', 'staff', 'client'].includes(level)) {
      return res.status(400).json({ error: 'Level must be admin, staff, or client' });
    }

    const query = `
      INSERT INTO user_types (company_id, name, description, permissions, level, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const permissionsJson = JSON.stringify(permissions);

    db.execute(query, [company_id, name, description, permissionsJson, level, created_by], (err, results) => {
      if (err) {
        logger.error('Error creating user type:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: 'User type name already exists for this company' });
        } else {
          res.status(500).json({ error: 'Error creating user type' });
        }
        return;
      }

      const newUserType = {
        id: results.insertId,
        company_id,
        name,
        description,
        permissions,
        level,
        active: true,
        createdAt: new Date().toISOString()
      };

      logger.info('User type created:', { id: results.insertId, name, level });
      res.status(201).json(newUserType);
    });
  } catch (error) {
    logger.error('Error in createUserType:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT actualizar tipo de usuario
const updateUserType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, level, active } = req.body;

    if (!name || !level) {
      return res.status(400).json({ error: 'Name and level are required' });
    }

    if (!['admin', 'staff', 'client'].includes(level)) {
      return res.status(400).json({ error: 'Level must be admin, staff, or client' });
    }

    const query = `
      UPDATE user_types
      SET name = ?, description = ?, permissions = ?, level = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const permissionsJson = JSON.stringify(permissions || {});
    const isActive = active !== undefined ? active : true;

    db.execute(query, [name, description, permissionsJson, level, isActive, id], (err, results) => {
      if (err) {
        logger.error('Error updating user type:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: 'User type name already exists for this company' });
        } else {
          res.status(500).json({ error: 'Error updating user type' });
        }
        return;
      }

      if (results.affectedRows === 0) {
        res.status(404).json({ error: 'User type not found' });
        return;
      }

      logger.info('User type updated:', { id, name, level });
      res.json({ message: 'User type updated successfully' });
    });
  } catch (error) {
    logger.error('Error in updateUserType:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE eliminar tipo de usuario (soft delete)
const deleteUserType = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero verificar si el tipo de usuario está siendo usado por algún usuario
    const checkUsageQuery = 'SELECT COUNT(*) as count FROM users WHERE user_type_id = ? AND active = 1';

    db.execute(checkUsageQuery, [id], (err, results) => {
      if (err) {
        logger.error('Error checking user type usage:', err);
        res.status(500).json({ error: 'Error checking user type usage' });
        return;
      }

      if (results[0].count > 0) {
        res.status(400).json({
          error: 'Cannot delete user type as it is currently assigned to active users',
          usageCount: results[0].count
        });
        return;
      }

      // Soft delete del tipo de usuario
      const deleteQuery = 'UPDATE user_types SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

      db.execute(deleteQuery, [id], (err, results) => {
        if (err) {
          logger.error('Error deleting user type:', err);
          res.status(500).json({ error: 'Error deleting user type' });
          return;
        }

        if (results.affectedRows === 0) {
          res.status(404).json({ error: 'User type not found' });
          return;
        }

        logger.info('User type deleted:', { id });
        res.json({ message: 'User type deleted successfully' });
      });
    });
  } catch (error) {
    logger.error('Error in deleteUserType:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getUserTypes,
  getUserTypeById,
  createUserType,
  updateUserType,
  deleteUserType
};
