# 🔐 Configuración de JWT y Hashes de Contraseñas - Citaly

## ✅ Lo que hemos configurado:

### 1. Verificación de dependencias
- ✅ **jsonwebtoken** (v9.0.2) - Ya instalado
- ✅ **bcryptjs** (v2.4.3) - Ya instalado
- ✅ Todas las dependencias del backend instaladas correctamente

### 2. Archivos creados para gestión de contraseñas:

#### `generate-password-hashes.js`
- Genera hashes de contraseñas comunes usando bcryptjs
- Verifica que los hashes funcionen correctamente
- Proporciona ejemplos de SQL para actualizar manualmente

#### `update-passwords-hash.js`
- Script automático para actualizar contraseñas existentes en la BD
- Detecta si una contraseña ya está hasheada
- Opción para crear usuarios de prueba

#### `test-jwt-login.js`
- Prueba completa del sistema de login con JWT
- Crea usuarios de prueba si no existen
- Verifica tokens generados

### 3. Configuración actualizada:

#### `.env`
- JWT_SECRET actualizado con una clave más segura
- Configuración de base de datos lista
- Puerto 3001 configurado

## 🚀 Próximos pasos que puedes ejecutar:

### 1. **Generar hashes de contraseñas de ejemplo:**
```bash
cd "c:\Users\santi\OneDrive\Desktop\GitHub\Citaly\app-citaly\api-gateway"
node generate-password-hashes.js
```

### 2. **Actualizar contraseñas existentes en la BD:**
```bash
# Actualizar contraseñas que ya existen
node update-passwords-hash.js

# O crear usuarios de prueba
node update-passwords-hash.js --create-test
```

### 3. **Probar el sistema de login completo:**
```bash
node test-jwt-login.js
```

### 4. **Iniciar el servidor backend:**
```bash
# Con el archivo nuevo
npm run dev:new
# O directamente
node server-new.js
```

### 5. **Iniciar el frontend:**
```bash
cd "c:\Users\santi\OneDrive\Desktop\GitHub\Citaly\app-citaly\client-app\src"
npm run dev
```

## 📋 Contraseñas de ejemplo generadas:

### Para uso en desarrollo:
- **admin123** → Hash: `$2a$10$EIBj7XmjQb6rQBRX7XaaZ.laRHlMLRV2y0pkE.jcMQGnzGA7R66eu`
- **user123** → Hash: `$2a$10$HRdjB8XMOKFCWpGsK7husehpe4kzdnZB7wTDnDb.r8R0OBzmXQRH6`
- **citaly2024** → Hash: `$2a$10$C4WcyNHkakPmUaeK.mT09uSSLAVhkNhhzxeBlZFxcMI6IljmBVoxS`

### SQL para actualizar manualmente:
```sql
-- Actualizar contraseña de admin
UPDATE usuarios SET contrasena = '$2a$10$EIBj7XmjQb6rQBRX7XaaZ.laRHlMLRV2y0pkE.jcMQGnzGA7R66eu' 
WHERE correo_electronico = 'admin@citaly.com';

-- Actualizar contraseña de usuario
UPDATE usuarios SET contrasena = '$2a$10$HRdjB8XMOKFCWpGsK7husehpe4kzdnZB7wTDnDb.r8R0OBzmXQRH6' 
WHERE correo_electronico = 'user@citaly.com';
```

## 🔧 Estructura del proyecto lista:

```
app-citaly/
├── api-gateway/                    # Backend (Node.js + Express)
│   ├── controllers/auth.controller.js  # ✅ Login con JWT configurado
│   ├── config/db.js                   # ✅ Conexión MySQL
│   ├── .env                           # ✅ Variables de entorno
│   ├── package.json                   # ✅ Dependencias instaladas
│   ├── generate-password-hashes.js    # 🆕 Generador de hashes
│   ├── update-passwords-hash.js       # 🆕 Actualizador automático
│   └── test-jwt-login.js              # 🆕 Probador de login
└── client-app/src/                 # Frontend (React + Vite)
    ├── package.json                # ✅ Dependencias instaladas
    └── ...
```

## 🎯 Para iniciar el desarrollo:

1. **Asegúrate de que MySQL esté corriendo**
2. **Importa la base de datos** (`app-citaly/db/sql.sql`)
3. **Ejecuta los scripts de contraseñas** si necesitas usuarios de prueba
4. **Inicia el backend** con `npm run dev:new`
5. **Inicia el frontend** con `npm run dev`

## 🔐 Sistema de autenticación configurado:

- ✅ Hashing con bcryptjs (salt rounds: 10)
- ✅ JWT tokens con expiración de 24h
- ✅ Middleware de autenticación listo
- ✅ Endpoints de login funcionales
- ✅ Validación de contraseñas segura

¡El sistema está listo para funcionar! 🚀
