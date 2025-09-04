const mysql = require('mysql2/promise');
const logger = require('../logger');
require('dotenv').config();

// Crear conexión a la base de datos existente (pool con soporte async/await)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'citaly',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // acquireTimeout no es válido para mysql2/promise
  // timeout y reconnect tampoco son válidos para mysql2/promise
});

// Verificar la conexión (sin detener el servidor si falla)
(async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('Conectado correctamente a la base de datos MySQL');
    connection.release();
  } catch (err) {
    logger.error('Error al conectar con la base de datos:', err);
    logger.warn('El servidor continuará funcionando sin conexión a la base de datos');
    // No hacer process.exit(1) para permitir probar las rutas
  }
})();

module.exports = pool;
