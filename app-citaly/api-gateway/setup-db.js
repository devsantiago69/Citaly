const mysql = require('mysql2/promise');

async function crearBaseDatos() {
  let connection;
  
  try {
    console.log('🔍 Conectando a MySQL...');
    
    // Conectar sin especificar base de datos
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('✅ Conectado a MySQL');

    // Verificar si existe la base de datos Citaly
    console.log('\n🔍 Verificando base de datos Citaly...');
    const [databases] = await connection.execute("SHOW DATABASES LIKE 'Citaly'");
    
    if (databases.length === 0) {
      console.log('❌ Base de datos Citaly no existe');
      console.log('📝 Creando base de datos Citaly...');
      
      await connection.execute('CREATE DATABASE Citaly');
      console.log('✅ Base de datos Citaly creada exitosamente');
    } else {
      console.log('✅ Base de datos Citaly ya existe');
    }

    // Usar la base de datos Citaly
    await connection.query('USE Citaly');

    // Verificar si existen las tablas principales
    console.log('\n🔍 Verificando tablas...');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('❌ No hay tablas en la base de datos');
      console.log('\n💡 Para crear las tablas necesitas:');
      console.log('   1. Ejecutar el archivo sql.sql en la base de datos');
      console.log('   2. O crear las tablas manualmente');
      
      console.log('\n📝 Creando tablas básicas para el login...');
      
      // Crear tabla empresas
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS empresas (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(255),
          nit VARCHAR(100),
          direccion VARCHAR(255),
          telefono VARCHAR(50),
          correo_electronico VARCHAR(100),
          descripcion TEXT,
          sitio_web VARCHAR(255),
          industria VARCHAR(100),
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          creado_por BIGINT
        )
      `);
      console.log('✅ Tabla empresas creada');

      // Crear tabla tipos_usuario
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS tipos_usuario (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(100),
          descripcion TEXT,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabla tipos_usuario creada');

      // Crear tabla usuarios
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          empresa_id BIGINT,
          tipo_usuario_id BIGINT,
          nombre VARCHAR(100),
          correo_electronico VARCHAR(100),
          contrasena VARCHAR(255),
          rol ENUM('Admin', 'Personal', 'Cliente'),
          telefono VARCHAR(50),
          estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          creado_por BIGINT,
          actualizado_por BIGINT NULL,
          FOREIGN KEY (empresa_id) REFERENCES empresas(id),
          FOREIGN KEY (tipo_usuario_id) REFERENCES tipos_usuario(id)
        )
      `);
      console.log('✅ Tabla usuarios creada');

      // Crear tabla categorias_servicio
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS categorias_servicio (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          empresa_id BIGINT,
          nombre VARCHAR(100),
          descripcion TEXT,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          creado_por BIGINT NULL,
          actualizado_por BIGINT NULL,
          FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )
      `);
      console.log('✅ Tabla categorias_servicio creada');

      // Insertar datos básicos
      console.log('\n📝 Insertando datos básicos...');
      
      // Insertar empresa de prueba
      const [empresaResult] = await connection.execute(
        'INSERT INTO empresas (nombre, nit, correo_electronico) VALUES (?, ?, ?)',
        ['Empresa Demo', '123456789', 'admin@empresa.com']
      );
      const empresaId = empresaResult.insertId;
      console.log(`✅ Empresa demo creada con ID: ${empresaId}`);

      // Insertar tipo de usuario
      const [tipoResult] = await connection.execute(
        'INSERT INTO tipos_usuario (nombre, descripcion) VALUES (?, ?)',
        ['Admin', 'Administrador del sistema']
      );
      const tipoId = tipoResult.insertId;
      console.log(`✅ Tipo de usuario creado con ID: ${tipoId}`);

      // Insertar usuario admin
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('123456', 10);
      
      const [userResult] = await connection.execute(
        'INSERT INTO usuarios (empresa_id, tipo_usuario_id, nombre, correo_electronico, contrasena, rol) VALUES (?, ?, ?, ?, ?, ?)',
        [empresaId, tipoId, 'Administrador', 'admin@prueba.com', passwordHash, 'Admin']
      );
      console.log(`✅ Usuario admin creado con ID: ${userResult.insertId}`);

      // Insertar categorías de ejemplo
      const categorias = [
        ['Cortes de Cabello', 'Servicios de peluquería y cortes'],
        ['Tratamientos Faciales', 'Cuidado y belleza facial'],
        ['Manicure y Pedicure', 'Cuidado de uñas']
      ];

      for (const [nombre, descripcion] of categorias) {
        await connection.execute(
          'INSERT INTO categorias_servicio (empresa_id, nombre, descripcion, creado_por) VALUES (?, ?, ?, ?)',
          [empresaId, nombre, descripcion, userResult.insertId]
        );
      }
      console.log('✅ Categorías de ejemplo creadas');

      console.log('\n🎉 ¡Base de datos configurada exitosamente!');
      console.log('\n📋 Credenciales de prueba:');
      console.log('   Email: admin@prueba.com');
      console.log('   Password: 123456');
      console.log(`   Empresa ID: ${empresaId}`);

    } else {
      console.log(`✅ Base de datos contiene ${tables.length} tablas:`);
      tables.forEach(table => {
        console.log(`   - ${Object.values(table)[0]}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

crearBaseDatos();
