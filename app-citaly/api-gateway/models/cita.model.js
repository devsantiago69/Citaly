// Modelo base para Citas
// Este archivo está preparado para futuras implementaciones con Sequelize u otro ORM

class CitaModel {
  constructor(data) {
    this.id = data.id || null;
    this.company_id = data.company_id || 1;
    this.client_id = data.client_id;
    this.service_id = data.service_id;
    this.staff_id = data.staff_id || null;
    this.date = data.date;
    this.time = data.time;
    this.status = data.status || 'scheduled';
    this.notes = data.notes || null;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || null;
  }

  // Validaciones
  static validate(data) {
    const errors = [];

    if (!data.client_id) {
      errors.push('client_id es requerido');
    }

    if (!data.service_id) {
      errors.push('service_id es requerido');
    }

    if (!data.date) {
      errors.push('date es requerido');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push('date debe tener formato YYYY-MM-DD');
    }

    if (!data.time) {
      errors.push('time es requerido');
    } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.time)) {
      errors.push('time debe tener formato HH:MM');
    }

    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push(`status debe ser uno de: ${validStatuses.join(', ')}`);
    }

    return errors;
  }

  // Formatear para respuesta de API
  toJSON() {
    return {
      id: this.id,
      company_id: this.company_id,
      client_id: this.client_id,
      service_id: this.service_id,
      staff_id: this.staff_id,
      date: this.date,
      time: this.time,
      status: this.status,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = CitaModel;
