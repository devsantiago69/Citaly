const express = require('express');
const cors = require('cors');
const http = require('http');
const config = require('./config/env');
const logger = require('./logger');
const { requestLogger, errorHandler, verifyToken } = require('./middlewares/auth');
const socketManager = require('./config/socket');
const webhookManager = require('./config/webhooks');

// Importar rutas principales
const authRoutes = require('./routes/auth.routes');
const citasRoutes = require('./routes/citas.routes');
const citasNewRoutes = require('./routes/citas-new.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

// Importar nuevas rutas para la estructura actualizada
const sucursalesRoutes = require('./routes/sucursales.routes');
const cajasRoutes = require('./routes/cajas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const personalRoutes = require('./routes/personal.routes');
const facturacionRoutes = require('./routes/facturacion.routes');
const serviciosNewRoutes = require('./routes/servicios-new.routes');

const app = express();
const server = http.createServer(app);

// Configuración de CORS avanzada para resolver problemas
const corsOptions = {
  origin: function(origin, callback) {
    // Permitir cualquier origen en desarrollo
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: false, // Cambiado a false para evitar problemas con credenciales en diferentes dominios
  optionsSuccessStatus: 200 // Algunos navegadores legacy requieren 200 en lugar de 204
};

// Middlewares globales
app.use(cors(corsOptions));

// Log de todas las solicitudes para debugging
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.referer || 'Desconocido';
  logger.info(`[CORS] Solicitud ${req.method} ${req.path} desde ${origin}`);

  // Agregar encabezados CORS a todas las respuestas manualmente
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});
// Registrar todos los orígenes de las solicitudes para depuración
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.referer || 'Desconocido';
  logger.info(`Solicitud recibida desde origen: ${origin}, ruta: ${req.path}, método: ${req.method}`);
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use(requestLogger);

// Rutas públicas (sin autenticación)
app.use('/api/auth', authRoutes);

// Middleware de autenticación (para todas las rutas siguientes)
app.use(verifyToken);

// Rutas protegidas
app.use('/api/citas', citasRoutes);

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
    message: 'Citaly API Gateway - Backend server is running (Nueva Estructura BD)',
    version: '3.0.0',
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

// ===== RUTAS DE LA NUEVA ESTRUCTURA =====

// Rutas de sucursales
app.use('/api/sucursales', sucursalesRoutes);

// Rutas de cajas y sesiones de caja
app.use('/api/cajas', cajasRoutes);

// Rutas de clientes (nueva estructura)
app.use('/api/clientes', clientesRoutes);

// Rutas de personal (nueva estructura)
app.use('/api/personal', personalRoutes);

// Rutas de facturación y suscripciones
app.use('/api/facturacion', facturacionRoutes);

// Rutas de citas (nueva estructura)
app.use('/api/citas-new', citasNewRoutes);

// Rutas de servicios (nueva estructura)
app.use('/api/servicios-new', serviciosNewRoutes);

// ===== RUTAS EXISTENTES (COMPATIBILIDAD) =====

// Rutas de citas/appointments (compatibilidad)
app.use('/api/appointments', citasRoutes);

// Rutas de usuarios (clientes, staff, admins)
app.use('/api', usuariosRoutes);

// ===== RUTAS DE SISTEMA Y UTILIDADES =====

// Rutas de servicios (estructura antigua)
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

// ===== TODAS LAS RUTAS HAN SIDO MIGRADAS Y ACTUALIZADAS =====
//
// RUTAS DE LA NUEVA ESTRUCTURA (v3.0.0):
// - /api/sucursales         - Gestión de sucursales (CRUD, asignaciones)
// - /api/cajas             - Gestión de cajas y sesiones de caja (abrir, cerrar, movimientos)
// - /api/clientes          - Gestión de clientes (nueva estructura con suscripciones)
// - /api/personal          - Gestión de personal (staff con especialidades y roles)
// - /api/facturacion       - Sistema de facturación y suscripciones completo
// - /api/citas-new         - Sistema de citas con nueva estructura (sucursales, personal, etc.)
// - /api/servicios-new     - Servicios con categorías y precios por sucursal
//
// RUTAS DE COMPATIBILIDAD (mantenidas para transición):
// - /api/appointments      - Citas (estructura antigua)
// - /api/users            - Usuarios (estructura antigua)
// - /api/services         - Servicios (estructura antigua)
// - /api/specialties      - Especialidades
// - /api/reports          - Reportes y estadísticas
// - /api/user-types       - Tipos de usuario
// - /api/staff            - Especialidades del personal
//
// Rutas existentes mantenidas para compatibilidad: appointments, users, services, specialties, reports, etc.

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
