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
  acquireTimeout: 60000,
  // timeout y reconnect no son válidos para mysql2/promise
});

// Verificar la conexión
(async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('Conectado correctamente a la base de datos MySQL');
    connection.release();
  } catch (err) {
    logger.error('Error al conectar con la base de datos:', err);
    process.exit(1);
  }
})();

module.exports = pool;
