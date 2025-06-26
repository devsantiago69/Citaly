require('dotenv').config();

// Establecer la zona horaria para toda la aplicación
process.env.TZ = process.env.TIMEZONE || 'America/Bogota';

const config = {
  // Puerto del servidor
  PORT: process.env.PORT || 3000,

  // Base de datos
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'citaly',

  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS ?
    process.env.CORS_ORIGINS.split(',') :
    ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'],

  // JWT (para futuras implementaciones)
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Empresa por defecto
  DEFAULT_COMPANY_ID: process.env.DEFAULT_COMPANY_ID || 1,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Zona horaria
  TIMEZONE: process.env.TIMEZONE || 'America/Bogota'
};

module.exports = config;
