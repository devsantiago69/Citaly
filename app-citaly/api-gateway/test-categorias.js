const db = require('../config/db');

// Función para probar la conexión y las tablas de categorías
async function testCategorias() {
  try {
    console.log('🔍 Probando conexión a la base de datos...');
    
    // Probar conexión
    const [rows] = await db.execute('SELECT 1 as test');
    console.log('✅ Conexión exitosa:', rows);

    // Verificar que existe la tabla categorias_servicio
    const [tables] = await db.execute('SHOW TABLES LIKE "categorias_servicio"');
    console.log('📋 Tabla categorias_servicio:', tables.length > 0 ? 'Existe' : 'No existe');

    if (tables.length > 0) {
      // Describir la estructura de la tabla
      const [columns] = await db.execute('DESCRIBE categorias_servicio');
      console.log('📝 Estructura de la tabla categorias_servicio:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.Key ? `[${col.Key}]` : ''}`);
      });

      // Contar registros existentes
      const [count] = await db.execute('SELECT COUNT(*) as total FROM categorias_servicio');
      console.log(`📊 Total de categorías existentes: ${count[0].total}`);

      // Mostrar algunas categorías de ejemplo
      if (count[0].total > 0) {
        const [samples] = await db.execute('SELECT id, empresa_id, nombre, descripcion FROM categorias_servicio LIMIT 5');
        console.log('📋 Ejemplos de categorías:');
        samples.forEach(cat => {
          console.log(`  - [${cat.id}] ${cat.nombre} (Empresa: ${cat.empresa_id})`);
        });
      }
    }

    // Verificar tabla de servicios relacionada
    const [serviceTables] = await db.execute('SHOW TABLES LIKE "servicios"');
    if (serviceTables.length > 0) {
      const [serviceCount] = await db.execute('SELECT COUNT(*) as total FROM servicios');
      console.log(`🛠️ Total de servicios existentes: ${serviceCount[0].total}`);
    }

    console.log('✅ Prueba completada exitosamente');
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testCategorias().then(() => {
    process.exit(0);
  });
}

module.exports = { testCategorias };
