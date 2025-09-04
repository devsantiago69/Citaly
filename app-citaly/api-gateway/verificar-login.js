const db = require('./config/db');
const logger = require('./logger');

async function verificarTablasLogin() {
  try {
    console.log('🔍 Verificando tablas necesarias para el login...\n');

    // Verificar si existen las tablas principales
    const tablasNecesarias = ['empresas', 'tipos_usuario', 'usuarios'];
    
    for (const tabla of tablasNecesarias) {
      try {
        const [rows] = await db.execute(`SHOW TABLES LIKE '${tabla}'`);
        if (rows.length > 0) {
          console.log(`✅ Tabla '${tabla}' existe`);
          
          // Mostrar estructura de la tabla
          const [structure] = await db.execute(`DESCRIBE ${tabla}`);
          console.log(`   Estructura de ${tabla}:`);
          structure.forEach(col => {
            console.log(`     - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
          });
          
          // Contar registros
          const [count] = await db.execute(`SELECT COUNT(*) as total FROM ${tabla}`);
          console.log(`     Total registros: ${count[0].total}\n`);
          
        } else {
          console.log(`❌ Tabla '${tabla}' NO existe\n`);
        }
      } catch (error) {
        console.log(`❌ Error verificando tabla '${tabla}': ${error.message}\n`);
      }
    }

    // Si la tabla usuarios existe, mostrar algunos usuarios de ejemplo
    try {
      const [usuarios] = await db.execute('SELECT id, nombre, correo_electronico, rol, empresa_id FROM usuarios LIMIT 5');
      if (usuarios.length > 0) {
        console.log('👥 Usuarios existentes:');
        usuarios.forEach(user => {
          console.log(`   - [${user.id}] ${user.nombre} (${user.correo_electronico}) - Rol: ${user.rol} - Empresa: ${user.empresa_id}`);
        });
        console.log('');
      } else {
        console.log('⚠️  La tabla usuarios existe pero está vacía\n');
      }
    } catch (error) {
      console.log(`❌ Error consultando usuarios: ${error.message}\n`);
    }

    // Verificar si hay empresas
    try {
      const [empresas] = await db.execute('SELECT id, nombre FROM empresas LIMIT 3');
      if (empresas.length > 0) {
        console.log('🏢 Empresas existentes:');
        empresas.forEach(emp => {
          console.log(`   - [${emp.id}] ${emp.nombre}`);
        });
        console.log('');
      } else {
        console.log('⚠️  No hay empresas registradas\n');
      }
    } catch (error) {
      console.log(`❌ Error consultando empresas: ${error.message}\n`);
    }

    console.log('📋 Diagnóstico completado.');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function crearUsuarioPrueba() {
  try {
    console.log('\n🧪 Creando usuario de prueba...');

    // Primero verificar si existe alguna empresa
    const [empresas] = await db.execute('SELECT id FROM empresas LIMIT 1');
    
    let empresaId = 1;
    if (empresas.length === 0) {
      console.log('📝 Creando empresa de prueba...');
      const [result] = await db.execute(
        'INSERT INTO empresas (nombre, nit, direccion, telefono, correo_electronico) VALUES (?, ?, ?, ?, ?)',
        ['Empresa Prueba', '123456789', 'Dirección de prueba', '555-1234', 'admin@empresa.com']
      );
      empresaId = result.insertId;
      console.log(`✅ Empresa creada con ID: ${empresaId}`);
    } else {
      empresaId = empresas[0].id;
      console.log(`✅ Usando empresa existente ID: ${empresaId}`);
    }

    // Crear tipo de usuario si no existe
    const [tipoUsuario] = await db.execute('SELECT id FROM tipos_usuario WHERE nombre = "Admin" LIMIT 1');
    let tipoUsuarioId = 1;
    
    if (tipoUsuario.length === 0) {
      console.log('📝 Creando tipo de usuario Admin...');
      const [result] = await db.execute(
        'INSERT INTO tipos_usuario (nombre, descripcion) VALUES (?, ?)',
        ['Admin', 'Administrador del sistema']
      );
      tipoUsuarioId = result.insertId;
      console.log(`✅ Tipo de usuario creado con ID: ${tipoUsuarioId}`);
    } else {
      tipoUsuarioId = tipoUsuario[0].id;
      console.log(`✅ Usando tipo de usuario existente ID: ${tipoUsuarioId}`);
    }

    // Verificar si ya existe el usuario de prueba
    const [usuarioExistente] = await db.execute('SELECT id FROM usuarios WHERE correo_electronico = ?', ['admin@prueba.com']);
    
    if (usuarioExistente.length > 0) {
      console.log('⚠️  Usuario admin@prueba.com ya existe');
      return;
    }

    // Crear usuario de prueba con contraseña hasheada
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('123456', 10);

    const [result] = await db.execute(
      'INSERT INTO usuarios (empresa_id, tipo_usuario_id, nombre, correo_electronico, contrasena, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [empresaId, tipoUsuarioId, 'Admin Prueba', 'admin@prueba.com', passwordHash, 'Admin']
    );

    console.log(`✅ Usuario de prueba creado exitosamente!`);
    console.log(`   Email: admin@prueba.com`);
    console.log(`   Password: 123456`);
    console.log(`   ID: ${result.insertId}`);
    console.log(`   Empresa ID: ${empresaId}`);

  } catch (error) {
    console.error('❌ Error creando usuario de prueba:', error);
  }
}

// Ejecutar ambas funciones
async function ejecutar() {
  await verificarTablasLogin();
  await crearUsuarioPrueba();
  process.exit(0);
}

ejecutar();
