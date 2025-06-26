// Modelo base para Usuarios (Clientes, Staff, Admins)
// Este archivo está preparado para futuras implementaciones con Sequelize u otro ORM

class UsuarioModel {
  constructor(data) {
    this.id = data.id || null;
    this.company_id = data.company_id || 1;
    this.user_type_id = data.user_type_id || null;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password || null; // No se debe exponer en respuestas
    this.phone = data.phone || null;
    this.role = data.role; // 'client', 'staff', 'admin'
    this.active = data.active !== false; // Por defecto true
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || null;
  }

  // Validaciones
  static validate(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('name es requerido y debe tener al menos 2 caracteres');
    }

    if (!data.email) {
      errors.push('email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('email debe tener un formato válido');
    }

    const validRoles = ['client', 'staff', 'admin'];
    if (!data.role || !validRoles.includes(data.role)) {
      errors.push(`role debe ser uno de: ${validRoles.join(', ')}`);
    }

    if (data.phone && !/^[\d\s\-\(\)\+]+$/.test(data.phone)) {
      errors.push('phone debe contener solo números y caracteres de formato');
    }

    return errors;
  }

  // Formatear para respuesta de API (sin password)
  toJSON() {
    const json = {
      id: this.id,
      company_id: this.company_id,
      user_type_id: this.user_type_id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      role: this.role,
      active: this.active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };

    // No incluir password en respuestas
    delete json.password;
    return json;
  }
}

// Modelo específico para Clientes (hereda de Usuario)
class ClienteModel extends UsuarioModel {
  constructor(data) {
    super(data);
    this.role = 'client';

    // Campos específicos de cliente
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.document_type = data.document_type || 'DNI';
    this.document_number = data.document_number;
    this.birth_date = data.birth_date || null;
    this.gender = data.gender || 'other';
    this.alternative_phone = data.alternative_phone || null;
    this.address = data.address || null;
    this.city = data.city || null;
    this.state = data.state || null;
    this.country = data.country || 'Colombia';

    // Contacto de emergencia
    this.emergency_contact_name = data.emergency_contact_name || null;
    this.emergency_contact_phone = data.emergency_contact_phone || null;
    this.emergency_contact_relationship = data.emergency_contact_relationship || null;

    // Información médica
    this.blood_type = data.blood_type || null;
    this.allergies = data.allergies || null;
    this.current_medications = data.current_medications || null;
    this.medical_conditions = data.medical_conditions || null;
    this.medical_notes = data.medical_notes || null;
    this.last_checkup_date = data.last_checkup_date || null;

    // Preferencias
    this.preferred_staff_id = data.preferred_staff_id || null;
    this.preferred_schedule = data.preferred_schedule || null;
    this.communication_preferences = data.communication_preferences || ['email'];
    this.status = data.status || 'active';

    // Estadísticas
    this.total_appointments = data.total_appointments || 0;
    this.completed_appointments = data.completed_appointments || 0;
    this.cancelled_appointments = data.cancelled_appointments || 0;
    this.total_spent = data.total_spent || 0;
    this.avg_rating = data.avg_rating || null;
    this.last_visit = data.last_visit || null;
  }

  // Validaciones específicas para cliente
  static validate(data) {
    const errors = super.validate(data);

    if (!data.first_name || data.first_name.trim().length < 2) {
      errors.push('first_name es requerido y debe tener al menos 2 caracteres');
    }

    if (!data.last_name || data.last_name.trim().length < 2) {
      errors.push('last_name es requerido y debe tener al menos 2 caracteres');
    }

    if (!data.document_number || data.document_number.trim().length < 3) {
      errors.push('document_number es requerido y debe tener al menos 3 caracteres');
    }

    const validGenders = ['male', 'female', 'other'];
    if (data.gender && !validGenders.includes(data.gender)) {
      errors.push(`gender debe ser uno de: ${validGenders.join(', ')}`);
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push(`status debe ser uno de: ${validStatuses.join(', ')}`);
    }

    return errors;
  }

  // Formatear nombre completo
  get fullName() {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  // Formatear para respuesta de API
  toJSON() {
    const json = super.toJSON();

    // Agregar campos específicos de cliente
    return {
      ...json,
      first_name: this.first_name,
      last_name: this.last_name,
      full_name: this.fullName,
      document_type: this.document_type,
      document_number: this.document_number,
      birth_date: this.birth_date,
      gender: this.gender,
      alternative_phone: this.alternative_phone,
      address: this.address,
      city: this.city,
      state: this.state,
      country: this.country,
      emergency_contact_name: this.emergency_contact_name,
      emergency_contact_phone: this.emergency_contact_phone,
      emergency_contact_relationship: this.emergency_contact_relationship,
      blood_type: this.blood_type,
      allergies: this.allergies,
      current_medications: this.current_medications,
      medical_conditions: this.medical_conditions,
      medical_notes: this.medical_notes,
      last_checkup_date: this.last_checkup_date,
      preferred_staff_id: this.preferred_staff_id,
      preferred_schedule: this.preferred_schedule,
      communication_preferences: this.communication_preferences,
      status: this.status,
      total_appointments: this.total_appointments,
      completed_appointments: this.completed_appointments,
      cancelled_appointments: this.cancelled_appointments,
      total_spent: this.total_spent,
      avg_rating: this.avg_rating,
      last_visit: this.last_visit
    };
  }
}

module.exports = { UsuarioModel, ClienteModel };
