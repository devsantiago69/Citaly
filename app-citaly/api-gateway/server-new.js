const express = require('express');
const cors = require('cors');
const http = require('http');
const config = require('./config/env');
const logger = require('./logger');
const { requestLogger, errorHandler, verifyToken } = require('./middlewares/auth');
const socketManager = require('./config/socket');
// const webhookManager = require('./config/webhooks');

// Rutas de facturación (nuevo sistema)
const billingRoutes = require('./routes/billing.routes');

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
const categoriasRoutes = require('./routes/categorias.routes');
// const serviciosNewRoutes = require('./routes/servicios-new.routes');
const appointmentsRoutes = require('./routes/appointments.routes');



const calendarioRoutes = require('./routes/calendario.routes');

const app = express();
const server = http.createServer(app);

// Configuración de CORS universal y correcta
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
}));

// Middleware para responder preflight y asegurar cabeceras CORS en todas las respuestas
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rutas de facturación (nuevo sistema)
app.use('/api/billing', billingRoutes);

// Rutas de calendario (nuevo sistema) - DEBE IR DESPUÉS DE LOS MIDDLEWARES DE CORS
app.use('/api/calendario', calendarioRoutes);


// Configuración de CORS universal y correcta
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
}));

// Middleware para responder preflight y asegurar cabeceras CORS en todas las respuestas
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
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

// Rutas protegidas (cada una maneja su propia autenticación)
app.use('/api/citas', citasRoutes);
app.use('/api/appointments', citasRoutes); // Alias para compatibilidad

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

// Rutas de categorías de servicios
app.use('/api/categorias', categoriasRoutes);

// Rutas de facturación y suscripciones
app.use('/api/facturacion', facturacionRoutes);

// Rutas de citas (nueva estructura)
app.use('/api/citas-new', citasNewRoutes);

// Rutas de servicios (nueva estructura)
// app.use('/api/servicios-new', serviciosNewRoutes);

// ===== RUTAS EXISTENTES (COMPATIBILIDAD) =====

// Rutas de usuarios (clientes, staff, admins)
app.use('/api', usuariosRoutes);

// ===== RUTAS DE SISTEMA Y UTILIDADES =====

// Rutas de servicios (estructura antigua)
const serviciosRoutes = require('./routes/servicios.routes');
app.use('/api/services', serviciosRoutes);
app.use('/api/servicios', serviciosRoutes);

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
app.use('/api/reportes', reportesRoutes); // Alias en español

// Rutas de búsqueda y utilidades
const busquedaRoutes = require('./routes/busqueda.routes');
app.use('/api', busquedaRoutes);

// Rutas de tiempo real y webhooks
const realtimeRoutes = require('./routes/realtime.routes');
app.use('/api', realtimeRoutes);

// Rutas de especialidades del personal
const staffSpecialtyRoutes = require('./routes/staffSpecialty.routes');
app.use('/api/staff', staffSpecialtyRoutes);

// Rutas de estadísticas de citas (nuevo endpoint)
app.use('/api/appointments', appointmentsRoutes);

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

// Middleware de manejo de errores global
app.use(errorHandler);

// Configuración de Socket.IO
socketManager.initialize(server);

// Iniciar servidor
const PORT = config.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`✅ Citaly API Gateway iniciado en puerto ${PORT}`, {
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    timezone: config.TIMEZONE
  });
});

// Manejo de errores no controlados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = { app, server };
