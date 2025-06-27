const bcrypt = require('bcryptjs');

// Crear un hash de contrase�a para pruebas
async function createTestPassword() {
  const password = '123456'; // Contrase�a de prueba simple
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  console.log(`Contrase�a original: ${password}`);
  console.log(`Hash generado: ${hash}`);

  // Verificar que el hash es correcto
  const isMatch = await bcrypt.compare(password, hash);
  console.log(`Verificaci�n correcta: ${isMatch}`);
}

createTestPassword().catch(console.error);
