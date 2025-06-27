/**
 * Script para actualizar la contraseña de usuarios existentes para pruebas
 *
 * Este script permite actualizar la contraseña de un usuario específico o
 * listar todos los usuarios disponibles en el sistema para facilitar las pruebas.
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Crear una conexión a la base de datos
const createConnection = async () => {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'citaly',
    waitForConnections: true,
    connectionLimit: 10,
  });
};

// Listar todos los usuarios disponibles
const listUsers = async (pool) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, nombre, correo_electronico, empresa_id, tipo_usuario_id FROM usuarios"
    );

    console.log('\n=== USUARIOS DISPONIBLES ===');
    if (users.length === 0) {
      console.log('No hay usuarios registrados');
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id}, Nombre: ${user.nombre}, Email: ${user.correo_electronico}, Empresa: ${user.empresa_id}, Tipo: ${user.tipo_usuario_id}`);
      });
    }
    console.log('===========================\n');
  } catch (error) {
    console.error('Error al listar usuarios:', error);
  }
};

// Actualizar la contraseña de un usuario
const updatePassword = async (pool, email, password) => {
  try {
    // Generar hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Actualizar la contraseña en la base de datos
    const [result] = await pool.execute(
      "UPDATE usuarios SET contrasena = ? WHERE correo_electronico = ?",
      [hash, email]
    );

    if (result.affectedRows > 0) {
      console.log(`? Contraseña actualizada para el usuario ${email}`);
      console.log(`?? Ahora puede iniciar sesión con la contraseña: ${password}`);
      return true;
    } else {
      console.log(`?? No se encontró el usuario con email ${email}`);
      return false;
    }
  } catch (error) {
    console.error('Error al actualizar contraseña:', error);
    return false;
  }
};

// Función principal
const main = async () => {
  const pool = await createConnection();

  try {
    // Obtener argumentos de línea de comandos
    const args = process.argv.slice(2);

    // Si no hay argumentos, mostrar ayuda y listar usuarios
    if (args.length === 0) {
      console.log('Uso: node update-user.js [email] [password]');
      console.log('  Si no se especifica email y password, se listarán todos los usuarios');
      await listUsers(pool);
      return;
    }

    // Si hay al menos un argumento (email)
    const email = args[0];
    // Si hay segundo argumento, es la contraseña; si no, usar '123456'
    const password = args.length > 1 ? args[1] : '123456';

    console.log(`?? Actualizando contraseña para ${email} a '${password}'...`);
    const success = await updatePassword(pool, email, password);

    if (success) {
      // Verificar datos del usuario
      const [users] = await pool.execute(
        "SELECT id, nombre, correo_electronico, empresa_id, tipo_usuario_id FROM usuarios WHERE correo_electronico = ?",
        [email]
      );

      if (users.length > 0) {
        const user = users[0];
        console.log('\n=== INFORMACIÓN DEL USUARIO ===');
        console.log(`ID: ${user.id}`);
        console.log(`Nombre: ${user.nombre}`);
        console.log(`Email: ${user.correo_electronico}`);
        console.log(`Empresa ID: ${user.empresa_id}`);
        console.log(`Tipo de usuario: ${user.tipo_usuario_id}`);
        console.log('==============================\n');
      }
    }
  } catch (error) {
    console.error('Error al ejecutar el script:', error);
  } finally {
    await pool.end();
  }
};

// Ejecutar función principal
main().catch(console.error);
