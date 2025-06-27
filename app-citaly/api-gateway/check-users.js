const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  console.log('Verificando usuarios en la base de datos...');

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
    // Verificar la estructura de la tabla de usuarios
    const [tables] = await pool.execute("SHOW TABLES LIKE 'usuarios'");
    if (tables.length === 0) {
      console.log('La tabla "usuarios" no existe');
      return;
    }

    // Verificar la estructura de la tabla
    const [columns] = await pool.execute("SHOW COLUMNS FROM usuarios");
    console.log('Estructura de la tabla "usuarios":');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Listar usuarios
    const [users] = await pool.execute("SELECT id, nombre, correo_electronico, empresa_id, tipo_usuario_id FROM usuarios LIMIT 10");

    console.log('\nUsuarios disponibles:');
    if (users.length === 0) {
      console.log('No hay usuarios registrados');
    } else {
      users.forEach(user => {
        console.log(`- ID: ${user.id}, Nombre: ${user.nombre}, Email: ${user.correo_electronico}, Empresa: ${user.empresa_id}, Tipo: ${user.tipo_usuario_id}`);
      });
    }

    // Buscar usuario específico
    const [anaUser] = await pool.execute("SELECT id, nombre, correo_electronico, empresa_id, tipo_usuario_id FROM usuarios WHERE correo_electronico = 'ana.garcia@bienestar.com'");

    console.log('\nBuscando usuario ana.garcia@bienestar.com:');
    if (anaUser.length === 0) {
      console.log('El usuario ana.garcia@bienestar.com no existe');
    } else {
      console.log(`Usuario encontrado: ID: ${anaUser[0].id}, Nombre: ${anaUser[0].nombre}, Email: ${anaUser[0].correo_electronico}, Empresa: ${anaUser[0].empresa_id}, Tipo: ${anaUser[0].tipo_usuario_id}`);
    }

  } catch (error) {
    console.error('Error al verificar usuarios:', error);
  } finally {
    await pool.end();
  }
}

checkUsers().catch(console.error);
