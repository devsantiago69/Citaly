const logger = require('../logger');

// Middleware para logging de requests
const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    headers: req.headers,
    origin: req.get('origin'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  next();
};

// Middleware para manejo de errores
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // No enviar el stack trace en producción
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(err.statusCode || 500).json({
    error: message,
    timestamp: new Date().toISOString()
  });
};

// Middleware para validar company_id (opcional)
const validateCompany = (req, res, next) => {
  // Por ahora hardcodeado a 1, pero se puede expandir
  req.companyId = 1;
  next();
};

// Middleware para validar parámetros requeridos
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = [];

    fields.forEach(field => {
      if (!req.body[field]) {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Campos requeridos faltantes: ${missing.join(', ')}`
      });
    }

    next();
  };
};

// Middleware para validar email
const validateEmail = (req, res, next) => {
  const { email } = req.body;

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'El formato del email no es válido'
      });
    }
  }

  next();
};

module.exports = {
  requestLogger,
  errorHandler,
  validateCompany,
  validateRequired,
  validateEmail
};
