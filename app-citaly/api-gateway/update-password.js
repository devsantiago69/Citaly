const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateUserPassword() {
  console.log('Actualizando contraseña del usuario...');

  // Hash de la contraseña "123456"
  const passwordHash = '$2a$10$8AJ9xEN3u33Jx/Y8O35Ute/bsBcc.JEG5wWqFaL7r6/qkcmh0gwB2';
  const userEmail = 'ana.garcia@bienestar.com';

  // Crear conexión a la base de datos
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'citaly',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    // Actualizar contraseña
    const [result] = await pool.execute(
      "UPDATE usuarios SET contrasena = ? WHERE correo_electronico = ?",
      [passwordHash, userEmail]
    );

    if (result.affectedRows > 0) {
      console.log(`Se actualizó la contraseña para el usuario ${userEmail}`);
      console.log('Ahora puedes iniciar sesión con la contraseña: 123456');
    } else {
      console.log(`No se encontró el usuario ${userEmail}`);
    }

  } catch (error) {
    console.error('Error al actualizar la contraseña:', error);
  } finally {
    await pool.end();
  }
}

updateUserPassword().catch(console.error);
