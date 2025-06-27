const bcrypt = require('bcryptjs');

// Crear un hash de contraseña para pruebas
async function createTestPassword() {
  const password = '123456'; // Contraseña de prueba simple
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  console.log(`Contraseña original: ${password}`);
  console.log(`Hash generado: ${hash}`);

  // Verificar que el hash es correcto
  const isMatch = await bcrypt.compare(password, hash);
  console.log(`Verificación correcta: ${isMatch}`);
}

createTestPassword().catch(console.error);
