const mysql = require('mysql2/promise');

async function verificarBaseDatos() {
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
  });

  try {
    console.log('🔍 Verificando bases de datos disponibles...\n');
    
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📊 Bases de datos disponibles:');
    databases.forEach(db => {
      console.log(`   - ${db.Database}`);
    });
    
    console.log('\n🔍 Buscando bases relacionadas con Citaly...');
    const citaly_dbs = databases.filter(db => 
      db.Database.toLowerCase().includes('citaly')
    );
    
    if (citaly_dbs.length > 0) {
      console.log('✅ Bases de datos relacionadas con Citaly:');
      citaly_dbs.forEach(db => {
        console.log(`   - ${db.Database}`);
      });
      
      // Verificar tablas en cada base
      for (const db of citaly_dbs) {
        console.log(`\n📋 Tablas en ${db.Database}:`);
        try {
          await connection.execute(`USE ${db.Database}`);
          const [tables] = await connection.execute('SHOW TABLES');
          if (tables.length > 0) {
            tables.forEach(table => {
              console.log(`   - ${Object.values(table)[0]}`);
            });
          } else {
            console.log('   (sin tablas)');
          }
        } catch (error) {
          console.log(`   Error: ${error.message}`);
        }
      }
    } else {
      console.log('❌ No se encontraron bases de datos relacionadas con Citaly');
      console.log('\n💡 Opciones:');
      console.log('   1. Crear la base de datos Citaly');
      console.log('   2. Ejecutar el script SQL para crear las tablas');
      console.log('   3. Verificar la configuración en db.js');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

verificarBaseDatos();
