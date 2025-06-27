const axios = require('axios');

async function testLogin() {
  console.log('Probando el endpoint de login...');

  try {
    // Credenciales actualizadas
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'ana.garcia@bienestar.com',
      password: '123456'
    });

    console.log('Respuesta del servidor:');
    console.log('Status:', response.status);
    console.log('Message:', response.data.message);
    console.log('Usuario:', response.data.user ? response.data.user.nombre : 'N/A');
    console.log('Token JWT generado:', response.data.token ? 'Sí (truncado)' : 'No');

    // Mostramos el token truncado por seguridad
    if (response.data.token) {
      const tokenPreview = response.data.token.substring(0, 15) + '...';
      console.log('Token preview:', tokenPreview);
    }

  } catch (error) {
    console.error('Error al realizar la prueba de login:');

    if (error.response) {
      // El servidor respondió con un código de estado diferente de 2xx
      console.error('Status:', error.response.status);
      console.error('Mensaje de error:', error.response.data);
    } else if (error.request) {
      // La solicitud se realizó pero no se recibió respuesta
      console.error('No se recibió respuesta del servidor. ¿El servidor está ejecutándose?');
    } else {
      // Error en la configuración de la solicitud
      console.error('Error de configuración:', error.message);
    }
  }
}

testLogin().catch(console.error);
