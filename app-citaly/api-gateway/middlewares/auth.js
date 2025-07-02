const logger = require('../logger');
const jwt = require('jsonwebtoken');

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

  // No enviar el stack trace en producci�n
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(err.statusCode || 500).json({
    error: message,
    timestamp: new Date().toISOString()
  });
};

// Middleware para validar token JWT y extraer datos de usuario y empresa
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  console.log('Auth header:', authHeader);
  console.log('Token recibido:', token);
  if (token == null) {
    console.log('No se recibió token');
    return res.sendStatus(401); // No hay token, no autorizado
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) {
      logger.error('Error en verificación de token JWT:', err);
      console.log('Error al verificar token:', err);
      return res.sendStatus(403); // Token inválido o expirado
    }

    // Log detallado del payload decodificado
    console.log('Payload decodificado:', JSON.stringify(user, null, 2));
    logger.info('Payload decodificado en verifyToken:', user);

    // Validar que empresa_id esté presente
    if (!user || !user.empresa_id) {
      logger.error('Token JWT sin empresa_id:', user);
      console.log('Token JWT sin empresa_id:', user);
      return res.status(403).json({ error: 'Token inválido: faltan datos de empresa', payload: user });
    }

    // Asegurarnos de que company_id esté presente para compatibilidad con otras partes del código
    req.user = {
      ...user,
      company_id: user.empresa_id // Asegurar que ambos estén disponibles
    };
    req.companyId = user.empresa_id; // Adjuntar companyId para usarlo en otros controladores
    next();
  });
};

// Middleware para validar par�metros requeridos
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
        error: 'El formato del email no es v�lido'
      });
    }
  }

  next();
};

module.exports = {
  requestLogger,
  errorHandler,
  verifyToken,
  validateRequired,
  validateEmail
};
