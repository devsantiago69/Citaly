const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./config/db');
const logger = require('./logger');

// Configuración del JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'citaly_jwt_secret_2024';

async function testLogin(email, password) {
  try {
    logger.info(`🔐 Probando login para: ${email}`);
    
    // Buscar usuario en la base de datos
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE correo_electronico = ?', [email]);
    
    if (rows.length === 0) {
      logger.error(`❌ Usuario no encontrado: ${email}`);
      return false;
    }
    
    const user = rows[0];
    logger.info(`👤 Usuario encontrado: ${user.nombre} (ID: ${user.id})`);
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.contrasena);
    
    if (!isPasswordValid) {
      logger.error(`❌ Contraseña incorrecta para: ${email}`);
      return false;
    }
    
    logger.info(`✅ Contraseña correcta para: ${email}`);
    
    // Generar token JWT
    const tokenPayload = {
      id: user.id,
      empresa_id: user.empresa_id,
      tipo_usuario_id: user.tipo_usuario_id,
      email: user.correo_electronico,
      rol: user.rol
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    
    logger.info(`🎫 Token JWT generado exitosamente`);
    logger.info(`📄 Token: ${token}`);
    
    // Verificar token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      logger.info(`✅ Token verificado correctamente`);
      logger.info(`📋 Datos del token:`, decoded);
    } catch (tokenError) {
      logger.error(`❌ Error verificando token: ${tokenError.message}`);
    }
    
    return {
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.correo_electronico,
        rol: user.rol,
        empresa_id: user.empresa_id
      },
      token
    };
    
  } catch (error) {
    logger.error(`❌ Error en test de login: ${error.message}`);
    return false;
  }
}

async function createTestUser() {
  try {
    logger.info('🏗️ Creando usuario de prueba...');
    
    // Verificar si ya existe
    const [existing] = await db.execute('SELECT * FROM usuarios WHERE correo_electronico = ?', ['test@citaly.com']);
    
    if (existing.length > 0) {
      logger.info('👤 Usuario de prueba ya existe');
      return existing[0];
    }
    
    // Obtener una empresa para asociar el usuario
    const [companies] = await db.execute('SELECT id FROM empresas LIMIT 1');
    
    if (companies.length === 0) {
      logger.error('❌ No hay empresas en la base de datos');
      return null;
    }
    
    const empresaId = companies[0].id;
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    await db.execute(
      `INSERT INTO usuarios (empresa_id, nombre, correo_electronico, contrasena, rol, estado) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [empresaId, 'Usuario Test', 'test@citaly.com', hashedPassword, 'Admin', 0]
    );
    
    logger.info('✅ Usuario de prueba creado:');
    logger.info('📧 Email: test@citaly.com');
    logger.info('🔑 Contraseña: test123');
    
    return { correo_electronico: 'test@citaly.com' };
    
  } catch (error) {
    logger.error(`❌ Error creando usuario de prueba: ${error.message}`);
    return null;
  }
}

async function main() {
  try {
    console.log('🧪 Testing JWT Login System for Citaly\n');
    
    // Crear usuario de prueba si no existe
    await createTestUser();
    
    // Probar login con diferentes credenciales
    const testCases = [
      { email: 'test@citaly.com', password: 'test123' },
      { email: 'admin@citaly.com', password: 'admin123' },
      { email: 'user@citaly.com', password: 'user123' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n${'='.repeat(50)}`);
      const result = await testLogin(testCase.email, testCase.password);
      
      if (result && result.success) {
        console.log(`✅ LOGIN EXITOSO para ${testCase.email}`);
      } else {
        console.log(`❌ LOGIN FALLIDO para ${testCase.email}`);
      }
    }
    
  } catch (error) {
    logger.error(`❌ Error general: ${error.message}`);
  } finally {
    await db.end();
    process.exit(0);
  }
}

// Ejecutar el test
main();
