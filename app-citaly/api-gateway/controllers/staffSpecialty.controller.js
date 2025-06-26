const db = require('../config/db');
const logger = require('../logger');
const { handleError } = require('../utils/helpers');

/**
 * Controlador para gestión de especialidades del personal
 */
class StaffSpecialtyController {
  /**
   * Obtener especialidades de un miembro del personal
   */
  async getStaffSpecialties(req, res) {
    try {
      const { staffId } = req.params;
      const { company_id = 1 } = req.query;

      const query = `
        SELECT
          ssa.id as assignment_id,
          ssa.staff_id,
          ssa.specialty_id,
          ssa.experience_level,
          ssa.certification_date,
          ssa.notes,
          ssa.active,
          s.name as specialty_name,
          s.description as specialty_description,
          s.category,
          u.name as staff_name
        FROM staff_specialty_assignments ssa
        JOIN specialties s ON ssa.specialty_id = s.id
        JOIN users u ON ssa.staff_id = u.id
        WHERE ssa.staff_id = ? AND u.company_id = ? AND ssa.active = 1
        ORDER BY s.name
      `;

      const [results] = await db.promise().execute(query, [staffId, company_id]);

      res.json(results);

    } catch (error) {
      logger.error('Error fetching staff specialties:', error);
      handleError(res, error, 'Error al obtener especialidades del personal');
    }
  }

  /**
   * Asignar especialidad a un miembro del personal
   */
  async assignSpecialtyToStaff(req, res) {
    try {
      const { staffId } = req.params;
      const {
        specialty_id,
        experience_level = 'beginner',
        certification_date,
        notes,
        company_id = 1
      } = req.body;

      if (!specialty_id) {
        return res.status(400).json({ error: 'La especialidad es requerida' });
      }

      // Verificar que el staff pertenece a la company
      const staffCheckQuery = 'SELECT id FROM users WHERE id = ? AND company_id = ? AND role = "staff"';
      const [staffCheck] = await db.promise().execute(staffCheckQuery, [staffId, company_id]);

      if (staffCheck.length === 0) {
        return res.status(404).json({ error: 'Personal no encontrado' });
      }

      // Verificar que la especialidad existe
      const specialtyCheckQuery = 'SELECT id FROM specialties WHERE id = ? AND company_id = ?';
      const [specialtyCheck] = await db.promise().execute(specialtyCheckQuery, [specialty_id, company_id]);

      if (specialtyCheck.length === 0) {
        return res.status(404).json({ error: 'Especialidad no encontrada' });
      }

      // Verificar si ya existe la asignación
      const existingQuery = `
        SELECT id FROM staff_specialty_assignments
        WHERE staff_id = ? AND specialty_id = ? AND active = 1
      `;
      const [existing] = await db.promise().execute(existingQuery, [staffId, specialty_id]);

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Esta especialidad ya está asignada al personal' });
      }

      // Crear la asignación
      const insertQuery = `
        INSERT INTO staff_specialty_assignments
        (staff_id, specialty_id, experience_level, certification_date, notes, active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, NOW())
      `;

      const [result] = await db.promise().execute(insertQuery, [
        staffId, specialty_id, experience_level, certification_date, notes
      ]);

      // Obtener la asignación creada con todos los detalles
      const getNewAssignmentQuery = `
        SELECT
          ssa.id as assignment_id,
          ssa.staff_id,
          ssa.specialty_id,
          ssa.experience_level,
          ssa.certification_date,
          ssa.notes,
          ssa.active,
          s.name as specialty_name,
          s.description as specialty_description,
          s.category,
          u.name as staff_name
        FROM staff_specialty_assignments ssa
        JOIN specialties s ON ssa.specialty_id = s.id
        JOIN users u ON ssa.staff_id = u.id
        WHERE ssa.id = ?
      `;

      const [newAssignment] = await db.promise().execute(getNewAssignmentQuery, [result.insertId]);

      logger.info('Specialty assigned to staff:', {
        staffId,
        specialty_id,
        assignment_id: result.insertId
      });

      res.status(201).json(newAssignment[0]);

    } catch (error) {
      logger.error('Error assigning specialty to staff:', error);
      handleError(res, error, 'Error al asignar especialidad al personal');
    }
  }

  /**
   * Actualizar asignación de especialidad
   */
  async updateStaffSpecialty(req, res) {
    try {
      const { staffId, assignmentId } = req.params;
      const { experience_level, certification_date, notes, active } = req.body;

      const updateQuery = `
        UPDATE staff_specialty_assignments
        SET experience_level = ?, certification_date = ?, notes = ?, active = ?, updated_at = NOW()
        WHERE id = ? AND staff_id = ?
      `;

      const [result] = await db.promise().execute(updateQuery, [
        experience_level, certification_date, notes, active, assignmentId, staffId
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Asignación de especialidad no encontrada' });
      }

      logger.info('Staff specialty assignment updated:', { staffId, assignmentId });

      res.json({ message: 'Asignación de especialidad actualizada exitosamente' });

    } catch (error) {
      logger.error('Error updating staff specialty:', error);
      handleError(res, error, 'Error al actualizar asignación de especialidad');
    }
  }

  /**
   * Eliminar asignación de especialidad (soft delete)
   */
  async removeStaffSpecialty(req, res) {
    try {
      const { staffId, assignmentId } = req.params;

      const deleteQuery = `
        UPDATE staff_specialty_assignments
        SET active = 0, updated_at = NOW()
        WHERE id = ? AND staff_id = ?
      `;

      const [result] = await db.promise().execute(deleteQuery, [assignmentId, staffId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Asignación de especialidad no encontrada' });
      }

      logger.info('Staff specialty assignment removed:', { staffId, assignmentId });

      res.json({ message: 'Asignación de especialidad eliminada exitosamente' });

    } catch (error) {
      logger.error('Error removing staff specialty:', error);
      handleError(res, error, 'Error al eliminar asignación de especialidad');
    }
  }
}

module.exports = new StaffSpecialtyController();
