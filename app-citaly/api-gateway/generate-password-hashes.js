const bcrypt = require('bcryptjs');

// Función para generar hash de una contraseña
function generateHash(password) {
  const saltRounds = 10;
  const hash = bcrypt.hashSync(password, saltRounds);
  console.log(`Contraseña: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('---');
  return hash;
}

// Función para verificar una contraseña contra un hash
function verifyPassword(password, hash) {
  const isValid = bcrypt.compareSync(password, hash);
  console.log(`Verificando: ${password} contra hash`);
  console.log(`Resultado: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
  console.log('---');
  return isValid;
}

// Script principal
console.log('🔐 Generador y Verificador de Contraseñas para Citaly\n');

// Generar hashes para contraseñas comunes
const commonPasswords = ['admin123', 'user123', '123456', 'citaly2024'];

console.log('📝 Generando hashes para contraseñas comunes:\n');
const hashes = {};

commonPasswords.forEach(password => {
  hashes[password] = generateHash(password);
});

console.log('\n🔍 Verificando contraseñas:\n');

// Verificar las contraseñas
Object.keys(hashes).forEach(password => {
  verifyPassword(password, hashes[password]);
});

console.log('\n💡 Para usar estos hashes:');
console.log('1. Copia el hash generado');
console.log('2. Actualiza la base de datos con: UPDATE usuarios SET contrasena = "HASH_AQUÍ" WHERE correo_electronico = "email@ejemplo.com"');
console.log('3. O usa el script update-passwords-hash.js para actualizar automáticamente');

console.log('\n📋 Ejemplo de SQL para actualizar manualmente:');
Object.keys(hashes).forEach(password => {
  console.log(`-- Para contraseña '${password}':`);
  console.log(`UPDATE usuarios SET contrasena = '${hashes[password]}' WHERE correo_electronico = 'admin@citaly.com';`);
  console.log('');
});
