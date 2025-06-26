const config = require('../config/env');

/**
 * Formatear fechas a formato colombiano
 */
const formatDate = (date, includeTime = false) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: config.TIMEZONE
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Date(date).toLocaleDateString('es-CO', options);
};

/**
 * Formatear hora a formato 12 horas
 */
const formatTime = (time) => {
  const [hours, minutes] = time.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));

  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Validar formato de fecha YYYY-MM-DD
 */
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validar formato de hora HH:MM
 */
const isValidTime = (timeString) => {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeString);
};

/**
 * Generar código único para citas
 */
const generateAppointmentCode = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `APT-${timestamp}-${random}`.toUpperCase();
};

/**
 * Calcular edad a partir de fecha de nacimiento
 */
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

/**
 * Formatear número de teléfono colombiano
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // Remover caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '');

  // Formatear según longitud
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }

  return phone; // Devolver original si no coincide con patrones conocidos
};

/**
 * Formatear moneda en pesos colombianos
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Sanitizar texto para evitar inyección SQL básica
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;

  return text
    .replace(/'/g, "''")
    .replace(/"/g, '""')
    .trim();
};

/**
 * Validar email
 */
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Generar respuesta estándar de API
 */
const apiResponse = (success, data, message, errors = null) => {
  return {
    success,
    data,
    message,
    errors,
    timestamp: new Date().toISOString()
  };
};

/**
 * Calcular duración entre dos horas
 */
const calculateDuration = (startTime, endTime) => {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);

  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / (1000 * 60));

  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;

  return { hours, minutes, totalMinutes: diffMins };
};

/**
 * Obtener inicio y fin de semana
 */
const getWeekRange = (date = new Date()) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea el primer día

  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

/**
 * Obtener inicio y fin de mes
 */
const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

module.exports = {
  formatDate,
  formatTime,
  isValidDate,
  isValidTime,
  generateAppointmentCode,
  calculateAge,
  formatPhoneNumber,
  formatCurrency,
  sanitizeText,
  isValidEmail,
  apiResponse,
  calculateDuration,
  getWeekRange,
  getMonthRange
};
