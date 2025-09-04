// Script de prueba para las rutas de categorías
// Este script puede ser usado para probar manualmente las rutas de categorías

const testCategorias = {
  // Datos de prueba
  baseUrl: 'http://localhost:3000/api/categorias',
  
  // Token de prueba (debe ser reemplazado con un token válido)
  token: 'Bearer YOUR_JWT_TOKEN_HERE',
  
  // Headers para las peticiones
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.token
    };
  },

  // Ejemplos de peticiones que puedes hacer con fetch o axios
  ejemplos: {
    
    // 1. Obtener todas las categorías
    obtenerTodas: `
      fetch('${this.baseUrl}', {
        method: 'GET',
        headers: ${JSON.stringify(this.getHeaders(), null, 2)}
      })
      .then(res => res.json())
      .then(data => console.log('Categorías:', data))
      .catch(err => console.error('Error:', err));
    `,

    // 2. Obtener categoría por ID
    obtenerPorId: `
      fetch('${this.baseUrl}/1', {
        method: 'GET',
        headers: ${JSON.stringify(this.getHeaders(), null, 2)}
      })
      .then(res => res.json())
      .then(data => console.log('Categoría:', data))
      .catch(err => console.error('Error:', err));
    `,

    // 3. Crear nueva categoría
    crear: `
      fetch('${this.baseUrl}', {
        method: 'POST',
        headers: ${JSON.stringify(this.getHeaders(), null, 2)},
        body: JSON.stringify({
          nombre: 'Nueva Categoría',
          descripcion: 'Descripción de la nueva categoría'
        })
      })
      .then(res => res.json())
      .then(data => console.log('Categoría creada:', data))
      .catch(err => console.error('Error:', err));
    `,

    // 4. Actualizar categoría
    actualizar: `
      fetch('${this.baseUrl}/1', {
        method: 'PUT',
        headers: ${JSON.stringify(this.getHeaders(), null, 2)},
        body: JSON.stringify({
          nombre: 'Categoría Actualizada',
          descripcion: 'Nueva descripción'
        })
      })
      .then(res => res.json())
      .then(data => console.log('Categoría actualizada:', data))
      .catch(err => console.error('Error:', err));
    `,

    // 5. Eliminar categoría
    eliminar: `
      fetch('${this.baseUrl}/1', {
        method: 'DELETE',
        headers: ${JSON.stringify(this.getHeaders(), null, 2)}
      })
      .then(res => res.json())
      .then(data => console.log('Categoría eliminada:', data))
      .catch(err => console.error('Error:', err));
    `,

    // 6. Obtener servicios de una categoría
    obtenerServicios: `
      fetch('${this.baseUrl}/1/servicios', {
        method: 'GET',
        headers: ${JSON.stringify(this.getHeaders(), null, 2)}
      })
      .then(res => res.json())
      .then(data => console.log('Servicios de la categoría:', data))
      .catch(err => console.error('Error:', err));
    `
  },

  // Casos de prueba con curl
  curlExamples: {
    obtenerTodas: `curl -X GET "${this.baseUrl}" -H "Authorization: ${this.token}" -H "Content-Type: application/json"`,
    
    crear: `curl -X POST "${this.baseUrl}" -H "Authorization: ${this.token}" -H "Content-Type: application/json" -d '{"nombre":"Categoría de Prueba","descripcion":"Descripción de prueba"}'`,
    
    actualizar: `curl -X PUT "${this.baseUrl}/1" -H "Authorization: ${this.token}" -H "Content-Type: application/json" -d '{"nombre":"Categoría Actualizada","descripcion":"Nueva descripción"}'`,
    
    eliminar: `curl -X DELETE "${this.baseUrl}/1" -H "Authorization: ${this.token}" -H "Content-Type: application/json"`
  }
};

console.log('🧪 Ejemplos de prueba para las rutas de categorías:');
console.log('');
console.log('📋 IMPORTANTE: Reemplaza YOUR_JWT_TOKEN_HERE con un token JWT válido');
console.log('');
console.log('🔗 Rutas disponibles:');
console.log('  GET    /api/categorias           - Obtener todas las categorías');
console.log('  GET    /api/categorias/:id       - Obtener categoría por ID');
console.log('  POST   /api/categorias           - Crear nueva categoría');
console.log('  PUT    /api/categorias/:id       - Actualizar categoría');
console.log('  DELETE /api/categorias/:id       - Eliminar categoría');
console.log('  GET    /api/categorias/:id/servicios - Obtener servicios de una categoría');
console.log('');
console.log('📝 Estructura de datos esperada para crear/actualizar:');
console.log(JSON.stringify({
  nombre: 'string (requerido)',
  descripcion: 'string (opcional)'
}, null, 2));
console.log('');
console.log('🔍 Para probar puedes usar:');
console.log('  - El navegador para peticiones GET');
console.log('  - Postman o Insomnia para todas las peticiones');
console.log('  - curl desde la línea de comandos');
console.log('  - fetch() desde la consola del navegador');

module.exports = testCategorias;
