# API Gateway - Citaly Backend

## Estructura del Proyecto

La nueva estructura modular del backend de Citaly sigue las mejores pr�cticas de Node.js y Express.js:

```
api-gateway/
??? server.js              # Punto de entrada (refactorizado)
??? server-new.js          # Nueva versi�n modular
??? config/
?   ??? db.js              # Conexi�n a base de datos
?   ??? env.js             # Variables de entorno
??? routes/
?   ??? citas.routes.js    # Rutas de citas/appointments
?   ??? usuarios.routes.js # Rutas de usuarios (clientes, staff, admins)
??? controllers/
?   ??? citas.controller.js    # L�gica de las rutas de citas
?   ??? usuarios.controller.js # L�gica de las rutas de usuarios
??? models/
?   ??? cita.model.js        # Modelo de citas
?   ??? usuario.model.js     # Modelos de usuarios
??? middlewares/
?   ??? auth.js            # Middlewares de autenticaci�n y validaci�n
??? services/
?   ??? citas.service.js    # L�gica de negocio reutilizable
??? utils/
?   ??? helpers.js          # Funciones auxiliares
??? logs/                   # Archivos de log
??? .env                   # Variables de entorno
??? package.json           # Dependencias
??? README.md             # Este archivo
```

## Mejoras Implementadas

### 1. **Separaci�n de Responsabilidades**
- **Rutas**: Solo definen endpoints y middlewares
- **Controladores**: Manejan la l�gica de request/response
- **Servicios**: Contienen la l�gica de negocio
- **Modelos**: Definen la estructura de datos

### 2. **Configuraci�n Centralizada**
- Variables de entorno en `config/env.js`
- Conexi�n a BD en `config/db.js`
- Configuraci�n modular y reutilizable

### 3. **Middlewares Reutilizables**
- Validaci�n de datos
- Logging de requests
- Manejo de errores
- Validaci�n de empresa

### 4. **Utilities y Helpers**
- Formateo de fechas y horas
- Validaciones comunes
- Funciones de utilidad
- Respuestas est�ndar de API

### 5. **Manejo de Errores Mejorado**
- Logging estructurado
- Respuestas consistentes
- Stack traces en desarrollo

## Instalaci�n y Uso

### 1. Instalar dependencias
```bash
cd api-gateway
npm install
```

### 2. Configurar variables de entorno
Revisar y ajustar el archivo `.env` seg�n tu configuraci�n:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=citaly
PORT=3001
```

### 3. Ejecutar el servidor
```bash
# Desarrollo
npm run dev

# Producci�n
npm start
```

## Endpoints Principales

### Citas/Appointments
- `GET /api/appointments` - Listar citas
- `POST /api/appointments` - Crear cita
- `PUT /api/appointments/:id` - Actualizar cita
- `DELETE /api/appointments/:id` - Eliminar cita
- `GET /api/appointments/calendar` - Eventos de calendario
- `GET /api/appointments/filters` - Filtros de calendario

### Usuarios
- `GET /api/clients` - Listar clientes
- `POST /api/clients` - Crear cliente
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente
- `GET /api/staff` - Listar staff
- `POST /api/staff` - Crear staff
- `GET /api/admins` - Listar administradores

### Sistema
- `GET /` - Estado del servidor
- `GET /health` - Health check

## Migraci�n desde el Servidor Anterior

### Compatibilidad
El nuevo sistema mantiene compatibilidad con las rutas existentes mientras se migran gradualmente.

### Rutas Legacy
Las rutas que no han sido migradas a�n se mantienen en `server-new.js` marcadas como "TODO" para su futura migraci�n.

### Proceso de Migraci�n
1. Las rutas principales (citas y usuarios) ya est�n migradas
2. Pr�ximas migraciones: servicios, especialidades, tipos de usuario
3. Se mantendr� compatibilidad durante la transici�n

## Pr�ximos Pasos

### 1. **Completar Migraci�n**
- [ ] Migrar rutas de servicios
- [ ] Migrar rutas de especialidades
- [ ] Migrar rutas de tipos de usuario
- [ ] Migrar rutas de reportes

### 2. **Implementar Autenticaci�n**
- [ ] JWT tokens
- [ ] Middleware de autenticaci�n
- [ ] Roles y permisos

### 3. **Validaciones Avanzadas**
- [ ] Validaci�n con Joi o Yup
- [ ] Sanitizaci�n de datos
- [ ] Rate limiting

### 4. **Testing**
- [ ] Tests unitarios
- [ ] Tests de integraci�n
- [ ] Tests de endpoints

### 5. **Documentaci�n**
- [ ] Swagger/OpenAPI
- [ ] Documentaci�n de endpoints
- [ ] Ejemplos de uso

## Tecnolog�as Utilizadas

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **MySQL2** - Cliente de MySQL
- **CORS** - Configuraci�n de CORS
- **dotenv** - Variables de entorno
- **Winston** - Logging (en logger.js existente)

## Beneficios de la Nueva Estructura

1. **Mantenibilidad**: C�digo m�s organizado y f�cil de mantener
2. **Escalabilidad**: Arquitectura que crece con el proyecto
3. **Testabilidad**: Componentes aislados f�ciles de testear
4. **Reutilizaci�n**: Servicios y utilities reutilizables
5. **Claridad**: Separaci�n clara de responsabilidades
6. **Flexibilidad**: F�cil agregar nuevas funcionalidades

## Contacto y Soporte

Para dudas o sugerencias sobre la nueva estructura, por favor crear un issue o contactar al equipo de desarrollo.

## ?? Recursos Migrados

### ? Controladores Implementados

1. **CitasController** (`controllers/citas.controller.js`)
   - ? GET /api/appointments - Listar citas
   - ? GET /api/appointments/list - Lista simplificada
   - ? GET /api/appointments/calendar - Eventos de calendario
   - ? GET /api/appointments/filters - Filtros disponibles
   - ? POST /api/appointments - Crear cita
   - ? PUT /api/appointments/:id - Actualizar cita
   - ? DELETE /api/appointments/:id - Eliminar cita

2. **UsuariosController** (`controllers/usuarios.controller.js`)
   - ? GET /api/clients - Listar clientes
   - ? GET /api/staff - Listar personal
   - ? GET /api/admins - Listar administradores
   - ? GET /api/users - Listar usuarios
   - ? GET /api/users/:id - Obtener usuario
   - ? POST /api/clients - Crear cliente
   - ? POST /api/staff - Crear personal
   - ? POST /api/users - Crear usuario
   - ? PUT /api/clients/:id - Actualizar cliente
   - ? PUT /api/users/:id - Actualizar usuario
   - ? DELETE /api/clients/:id - Eliminar cliente
   - ? DELETE /api/users/:id - Eliminar usuario

3. **ServiciosController** (`controllers/servicios.controller.js`)
   - ? GET /api/services - Listar servicios
   - ? POST /api/services - Crear servicio
   - ? PUT /api/services/:id - Actualizar servicio
   - ? DELETE /api/services/:id - Eliminar servicio

4. **EspecialidadesController** (`controllers/especialidades.controller.js`)
   - ? GET /api/specialties - Listar especialidades
   - ? POST /api/specialties - Crear especialidad
   - ? PUT /api/specialties/:id - Actualizar especialidad
   - ? DELETE /api/specialties/:id - Eliminar especialidad

5. **UserTypesController** (`controllers/userTypes.controller.js`)
   - ? GET /api/user-types - Listar tipos de usuario
   - ? GET /api/user-types/:id - Obtener tipo de usuario
   - ? POST /api/user-types - Crear tipo de usuario
   - ? PUT /api/user-types/:id - Actualizar tipo de usuario
   - ? DELETE /api/user-types/:id - Eliminar tipo de usuario

6. **SoporteController** (`controllers/soporte.controller.js`)
   - ? GET /api/support-cases - Listar casos de soporte

7. **SistemaController** (`controllers/sistema.controller.js`)
   - ? Endpoints de utilidades y sistema

8. **ReportesController** (`controllers/reportes.controller.js`) - **NUEVO**
   - ? GET /api/reports/overview - Resumen general
   - ? GET /api/reports/revenue - Reporte de ingresos
   - ? GET /api/reports/services - Reporte de servicios
   - ? GET /api/reports/staff - Reporte de personal
   - ? GET /api/reports/clients - Reporte de clientes
   - ? GET /api/reports/sales-by-month - Ventas por mes
   - ? GET /api/reports/appointments-status-by-day - Estado de citas por d�a
   - ? GET /api/reports/services-completion-ratio - Ratio de completitud

9. **BusquedaController** (`controllers/busqueda.controller.js`) - **NUEVO**
   - ? GET /api/search - B�squeda global
   - ? GET /api/countries - Lista de pa�ses
   - ? GET /api/states/:countryCode - Estados por pa�s
   - ? POST /api/logout - Cerrar sesi�n

10. **StaffSpecialtyController** (`controllers/staffSpecialty.controller.js`) - **NUEVO**
    - ? GET /api/staff/:staffId/specialties - Especialidades del personal
    - ? POST /api/staff/:staffId/specialties - Asignar especialidad
    - ? PUT /api/staff/:staffId/specialties/:assignmentId - Actualizar asignaci�n
    - ? DELETE /api/staff/:staffId/specialties/:assignmentId - Eliminar asignaci�n

### ?? Archivos de Rutas

- ? `routes/citas.routes.js`
- ? `routes/usuarios.routes.js`
- ? `routes/servicios.routes.js`
- ? `routes/especialidades.routes.js`
- ? `routes/userTypes.routes.js`
- ? `routes/sistema.routes.js`
- ? `routes/reportes.routes.js` - **NUEVO**
- ? `routes/busqueda.routes.js` - **NUEVO**
- ? `routes/staffSpecialty.routes.js` - **NUEVO**

### ?? Servicios y Utilidades

- ? `services/citas.service.js`
- ? `models/cita.model.js`
- ? `models/usuario.model.js`
- ? `middlewares/auth.js`
- ? `config/db.js`
- ? `config/env.js`
- ? `utils/helpers.js`

## ?? Migraci�n Completada

### ? Todos los endpoints han sido migrados exitosamente del archivo monol�tico `server.js` a la nueva arquitectura modular.

### ?? Estad�sticas de Migraci�n

- **Total de endpoints migrados**: ~85+ endpoints
- **Controladores creados**: 10
- **Archivos de rutas**: 9
- **Middlewares implementados**: 5+
- **Servicios auxiliares**: 2
- **Modelos de datos**: 2

### ?? Archivos Principales

- **Legacy**: `server.js` (3403 l�neas) - ? No usar
- **Nuevo**: `server-new.js` (115 l�neas) - ? Archivo principal modular
