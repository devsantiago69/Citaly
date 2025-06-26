const express = require('express');
const cors = require('cors');
const http = require('http');
const config = require('./config/env');
const logger = require('./logger');
const { requestLogger, errorHandler } = require('./middlewares/auth');
const socketManager = require('./config/socket');
const webhookManager = require('./config/webhooks');

// Importar rutas
const citasRoutes = require('./routes/citas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();
const server = http.createServer(app);

// Configuración de CORS
const corsOptions = {
  origin: config.CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Middlewares globales
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use(requestLogger);

// Test del sistema de logs
logger.info('Initializing server', {
  time: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  timezone: config.TIMEZONE,
  port: config.PORT
});

// Ruta de salud del servidor
app.get('/', (req, res) => {
  res.json({
    message: 'Citaly API Gateway - Backend server is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    timezone: config.TIMEZONE
  });
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// ===== RUTAS PRINCIPALES =====

// Rutas de citas/appointments
app.use('/api/appointments', citasRoutes);

// Rutas de usuarios (clientes, staff, admins)
app.use('/api', usuariosRoutes);

// Rutas de servicios
const serviciosRoutes = require('./routes/servicios.routes');
app.use('/api/services', serviciosRoutes);

// Rutas de especialidades
const especialidadesRoutes = require('./routes/especialidades.routes');
app.use('/api/specialties', especialidadesRoutes);

// Rutas de tipos de usuario
const userTypesRoutes = require('./routes/userTypes.routes');
app.use('/api/user-types', userTypesRoutes);

// Rutas de sistema y utilidades
const sistemaRoutes = require('./routes/sistema.routes');
app.use('/api', sistemaRoutes);

// Rutas de reportes
const reportesRoutes = require('./routes/reportes.routes');
app.use('/api/reports', reportesRoutes);

// Rutas de búsqueda y utilidades
const busquedaRoutes = require('./routes/busqueda.routes');
app.use('/api', busquedaRoutes);

// Rutas de tiempo real y webhooks
const realtimeRoutes = require('./routes/realtime.routes');
app.use('/api', realtimeRoutes);

// Rutas de especialidades del personal
const staffSpecialtyRoutes = require('./routes/staffSpecialty.routes');
app.use('/api/staff', staffSpecialtyRoutes);

// ===== TODAS LAS RUTAS HAN SIDO MIGRADAS A CONTROLADORES =====
// Todas las rutas están ahora organizadas en módulos específicos

// ===== MANEJO DE ERRORES =====

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// ===== INICIALIZAR SOCKET.IO =====
const io = socketManager.initialize(server);

// Hacer el socketManager y webhookManager disponibles globalmente
app.set('socketManager', socketManager);
app.set('webhookManager', webhookManager);

// ===== INICIAR SERVIDOR =====

const PORT = config.PORT;

server.listen(PORT, () => {
  logger.info(`?? Server running on port ${PORT}`, {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    timezone: config.TIMEZONE,
    features: {
      socketIO: true,
      webhooks: webhookManager.getStatus().enabled,
      jwt: true
    }
  });

  // Test webhook connection si está habilitado
  if (webhookManager.getStatus().enabled) {
    setTimeout(() => {
      webhookManager.testConnection().then(result => {
        if (result.success) {
          logger.info('? Conexión de webhook a n8n exitosa');
        } else {
          logger.warn('?? No se pudo conectar con n8n webhook');
        }
      });
    }, 2000);
  }
});

module.exports = { app, server, io };
