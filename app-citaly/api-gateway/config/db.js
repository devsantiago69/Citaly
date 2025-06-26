const mysql = require('mysql2');
const logger = require('../logger');
require('dotenv').config();

// Crear conexión a la base de datos existente
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',  // XAMPP usa localhost
  user: process.env.DB_USER || 'root',      // Usuario por defecto de XAMPP
  password: process.env.DB_PASSWORD || '',  // XAMPP no tiene contraseña por defecto
  database: process.env.DB_NAME || 'citaly',
  waitForConnections: true,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Verificar la conexión
db.getConnection((err, connection) => {
  if (err) {
    logger.error('Error al conectar con la base de datos:', err);
    process.exit(1);
  }
  logger.info('Conectado correctamente a la base de datos MySQL');
  connection.release();
});

// Función helper para manejo de queries
const handleQuery = (res, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) {
        logger.error('Query Error:', err);
        if (res) {
          res.status(500).json({ error: err.message });
        }
        reject(err);
      } else {
        if (res) {
          res.json(results);
        }
        resolve(results);
      }
    });
  });
};

module.exports = { db, handleQuery };
