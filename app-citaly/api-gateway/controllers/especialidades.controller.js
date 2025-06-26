const { db } = require('../config/db');
const logger = require('../logger');

// GET todas las especialidades
const getEspecialidades = async (req, res) => {
  try {
    console.log('GET /api/specialties - Request received');
    logger.info('API Request received', {
      method: 'GET',
      path: '/api/specialties',
      timestamp: new Date().toISOString()
    });

    const query = 'SELECT id, name, description, active FROM specialties WHERE company_id = ? ORDER BY name';
    logger.info('Executing query', {
      query: query,
      timestamp: new Date().toISOString()
    });

    db.query(query, [req.companyId], (err, results) => {
      if (err) {
        console.error('? Database Error:', err);
        return res.status(500).json({ error: err.message });
      }

      console.log('Query results:', results);
      logger.info('Query executed successfully', {
        count: results.length,
        results: results,
        timestamp: new Date().toISOString()
      });

      // Agregar color por defecto para UI
      const resultsWithColor = results.map(specialty => ({
        ...specialty,
        color: '#3B82F6' // Color azul por defecto, solo para UI
      }));

      res.json(resultsWithColor);
    });
  } catch (error) {
    logger.error('Error in getEspecialidades:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST crear nueva especialidad
const createEspecialidad = async (req, res) => {
  try {
    console.log('?? POST /api/specialties - Request received');
    console.log('?? Request body:', JSON.stringify(req.body, null, 2));

    const { name, description } = req.body;

    const query = `
      INSERT INTO specialties (company_id, name, description, created_by)
      VALUES (?, ?, ?, 1)
    `;

    console.log('?? Query to execute:', query);
    console.log('?? Query parameters:', [req.companyId, name, description]);

    db.query(query, [req.companyId, name, description], (err, results) => {
      if (err) {
        console.error('? Database Error:', err);
        return res.status(500).json({ error: err.message });
      }

      console.log('? Query successful');
      console.log('?? Insert ID:', results.insertId);

      const newSpecialty = {
        id: results.insertId,
        name,
        description,
        color: '#3B82F6', // Solo para UI
        active: true
      };

      console.log('?? Returning:', JSON.stringify(newSpecialty, null, 2));

      res.status(201).json(newSpecialty);
    });
  } catch (error) {
    logger.error('Error in createEspecialidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT actualizar especialidad
const updateEspecialidad = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`?? PUT /api/specialties/${id} - Request received`);
    console.log('?? Request body:', JSON.stringify(req.body, null, 2));

    const { name, description, active } = req.body;

    const query = `
      UPDATE specialties
      SET name = ?, description = ?, active = ?
      WHERE id = ? AND company_id = ?
    `;

    console.log('?? Query to execute:', query);
    console.log('?? Query parameters:', [name, description, active !== undefined ? active : true, id, req.companyId]);

    db.query(query, [name, description, active !== undefined ? active : true, id, req.companyId], (err, results) => {
      if (err) {
        console.error('? Database Error:', err);
        return res.status(500).json({ error: err.message });
      }

      console.log('? Query successful');
      console.log('?? Affected rows:', results.affectedRows);

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Especialidad no encontrada' });
      }

      const updatedSpecialty = {
        id: parseInt(id),
        name,
        description,
        color: '#3B82F6', // Solo para UI
        active
      };

      console.log('?? Returning:', JSON.stringify(updatedSpecialty, null, 2));

      res.json(updatedSpecialty);
    });
  } catch (error) {
    logger.error('Error in updateEspecialidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE eliminar especialidad
const deleteEspecialidad = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`? DELETE /api/specialties/${id} - Request received`);

    // Primero verificamos si la especialidad está siendo usada por algún staff
    const checkUsageQuery = `
      SELECT COUNT(*) as usageCount
      FROM staff_specialties
      WHERE specialty_id = ?
    `;

    db.query(checkUsageQuery, [id], (err, results) => {
      if (err) {
        console.error('? Database Error:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results[0].usageCount > 0) {
        console.log('?? Specialty is in use by staff members');
        return res.status(400).json({
          error: 'No se puede eliminar la especialidad porque está asignada a miembros del staff'
        });
      }

      // Si no está en uso, procedemos a eliminar
      const deleteQuery = 'DELETE FROM specialties WHERE id = ? AND company_id = ?';
      console.log('?? Query to execute:', deleteQuery);
      console.log('?? Query parameters:', [id, req.companyId]);

      db.query(deleteQuery, [id, req.companyId], (err, results) => {
        if (err) {
          console.error('? Database Error:', err);
          console.error('Stack:', err.stack);
          return res.status(500).json({ error: err.message });
        }

        console.log('? Query successful');
        console.log('?? Affected rows:', results.affectedRows);

        if (results.affectedRows === 0) {
          console.log('?? No specialty found with ID:', id);
          return res.status(404).json({ error: 'Especialidad no encontrada' });
        }

        res.status(204).send();
      });
    });
  } catch (error) {
    logger.error('Error in deleteEspecialidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET especialidades de un staff
const getStaffEspecialidades = async (req, res) => {
  try {
    const { staffId } = req.params;
    console.log(`?? GET /api/staff/${staffId}/specialties - Request received`);

    const query = `
      SELECT
        ss.id as assignment_id,
        s.id,
        s.name,
        s.description,
        ss.proficiency_level,
        ss.years_experience,
        ss.certification_info,
        ss.is_primary
      FROM staff_specialties ss
      JOIN specialties s ON ss.specialty_id = s.id
      WHERE ss.staff_id = ? AND s.active = 1
      ORDER BY ss.is_primary DESC, s.name
    `;

    db.query(query, [staffId], (err, results) => {
      if (err) {
        console.error('? Database Error:', err);
        return res.status(500).json({ error: err.message });
      }

      console.log('? Staff specialties retrieved:', results.length);

      // Agregar color por defecto para UI
      const resultsWithColor = results.map(specialty => ({
        ...specialty,
        color: '#3B82F6'
      }));

      res.json(resultsWithColor);
    });
  } catch (error) {
    logger.error('Error in getStaffEspecialidades:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST asignar especialidad a staff
const assignEspecialidadToStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { specialtyId, proficiencyLevel, yearsExperience, certificationInfo, isPrimary } = req.body;

    console.log(`?? POST /api/staff/${staffId}/specialties - Request received`);
    console.log('?? Request body:', JSON.stringify(req.body, null, 2));

    // Si se marca como principal, primero desmarcar otras especialidades principales
    const updatePrimaryQuery = isPrimary ?
      'UPDATE staff_specialties SET is_primary = FALSE WHERE staff_id = ?' : null;

    const insertQuery = `
      INSERT INTO staff_specialties (staff_id, specialty_id, proficiency_level, years_experience, certification_info, is_primary)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const executeInsert = () => {
      db.query(insertQuery, [
        staffId,
        specialtyId,
        proficiencyLevel || 'intermediate',
        yearsExperience || 0,
        certificationInfo || null,
        isPrimary || false
      ], (err, results) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Esta especialidad ya está asignada a este staff' });
          }
          console.error('? Database Error:', err);
          return res.status(500).json({ error: err.message });
        }

        console.log('? Specialty assigned successfully');
        res.status(201).json({
          id: results.insertId,
          message: 'Especialidad asignada correctamente'
        });
      });
    };

    if (updatePrimaryQuery && isPrimary) {
      db.query(updatePrimaryQuery, [staffId], (err) => {
        if (err) {
          console.error('? Error updating primary status:', err);
          return res.status(500).json({ error: err.message });
        }
        executeInsert();
      });
    } else {
      executeInsert();
    }
  } catch (error) {
    logger.error('Error in assignEspecialidadToStaff:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT actualizar asignación de especialidad
const updateStaffEspecialidad = async (req, res) => {
  try {
    const { staffId, assignmentId } = req.params;
    const { proficiencyLevel, yearsExperience, certificationInfo, isPrimary } = req.body;

    console.log(`?? PUT /api/staff/${staffId}/specialties/${assignmentId} - Request received`);

    // Si se marca como principal, primero desmarcar otras especialidades principales
    const updatePrimaryQuery = isPrimary ?
      'UPDATE staff_specialties SET is_primary = FALSE WHERE staff_id = ? AND id != ?' : null;

    const updateQuery = `
      UPDATE staff_specialties
      SET proficiency_level = ?, years_experience = ?, certification_info = ?, is_primary = ?
      WHERE id = ? AND staff_id = ?
    `;

    const executeUpdate = () => {
      db.query(updateQuery, [
        proficiencyLevel || 'intermediate',
        yearsExperience || 0,
        certificationInfo || null,
        isPrimary || false,
        assignmentId,
        staffId
      ], (err, results) => {
        if (err) {
          console.error('? Database Error:', err);
          return res.status(500).json({ error: err.message });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ error: 'Asignación de especialidad no encontrada' });
        }

        console.log('? Specialty assignment updated successfully');
        res.json({ message: 'Especialidad actualizada correctamente' });
      });
    };

    if (updatePrimaryQuery && isPrimary) {
      db.query(updatePrimaryQuery, [staffId, assignmentId], (err) => {
        if (err) {
          console.error('? Error updating primary status:', err);
          return res.status(500).json({ error: err.message });
        }
        executeUpdate();
      });
    } else {
      executeUpdate();
    }
  } catch (error) {
    logger.error('Error in updateStaffEspecialidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE eliminar asignación de especialidad
const deleteStaffEspecialidad = async (req, res) => {
  try {
    const { staffId, assignmentId } = req.params;
    console.log(`? DELETE /api/staff/${staffId}/specialties/${assignmentId} - Request received`);

    const query = 'DELETE FROM staff_specialties WHERE id = ? AND staff_id = ?';

    db.query(query, [assignmentId, staffId], (err, results) => {
      if (err) {
        console.error('? Database Error:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Asignación de especialidad no encontrada' });
      }

      console.log('? Specialty assignment deleted successfully');
      res.status(204).send();
    });
  } catch (error) {
    logger.error('Error in deleteStaffEspecialidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getEspecialidades,
  createEspecialidad,
  updateEspecialidad,
  deleteEspecialidad,
  getStaffEspecialidades,
  assignEspecialidadToStaff,
  updateStaffEspecialidad,
  deleteStaffEspecialidad
};
