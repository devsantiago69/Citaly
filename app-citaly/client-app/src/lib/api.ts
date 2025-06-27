import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Error en interceptor de respuesta:",
      error.response ? `Status: ${error.response.status}, Mensaje: ${JSON.stringify(error.response.data)}` : 'Sin respuesta');

    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log("? Sesión expirada o no autorizada");

      // Eliminar datos de sesión
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Retrasar la redirección para dar tiempo a que se completen otras operaciones
      if (window.location.pathname !== '/login') {
        console.log("? Redirigiendo a /login en 100ms");
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
