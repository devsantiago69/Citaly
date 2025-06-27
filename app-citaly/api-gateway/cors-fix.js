/**
 * Script para probar y reparar la configuración CORS del servidor
 */
const express = require('express');
const cors = require('cors');
const logger = require('./logger');

const app = express();
const PORT = 3099;

// Configuración de CORS completamente abierta para depuración
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: false
}));

// Middleware para registrar todas las solicitudes
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.referer || 'Desconocido';
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} desde ${origin}`);
  next();
});

// Ruta de prueba para login
app.post('/api/auth/login', express.json(), (req, res) => {
  const { email, password } = req.body;
  console.log(`Intento de login con: ${email}`);

  if (email === 'test@example.com' && password === 'password123') {
    res.json({
      message: 'Login exitoso',
      token: 'test-token-1234567890',
      user: {
        id: '1',
        nombre: 'Usuario de Prueba',
        email: email,
        role: 1,
        empresa: {
          id: 1,
          nombre: 'Empresa de Prueba'
        }
      }
    });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor de prueba CORS ejecutándose en http://localhost:${PORT}`);
  console.log('Para probar, usa:');
  console.log(`curl -X POST http://localhost:${PORT}/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'`);
});
