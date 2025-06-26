# ?? Citaly - Sistema de Gestión de Citas Médicas

Sistema integral de gestión de citas médicas con dashboard administrativo, desarrollado con React/TypeScript (frontend) y Node.js/Express (backend).

## ?? Características Principales

- ? **Dashboard en Tiempo Real** - Visualización de estadísticas y métricas
- ? **Gestión de Citas** - Programación, confirmación y seguimiento
- ? **Gestión de Pacientes** - Registro completo de clientes/pacientes
- ? **Gestión de Personal** - Administración de staff médico
- ? **Gestión de Servicios** - Catálogo de servicios médicos
- ? **Especialidades** - Manejo de especialidades médicas
- ? **Modo Offline** - Funciona con datos de prueba cuando no hay backend
- ? **API RESTful** - Backend modular y escalable
- ? **Base de Datos MySQL** - Esquema completo para gestión médica

## ?? Estructura del Proyecto

```
citaly/
??? app-citaly/
?   ??? client-app/          # Frontend React/TypeScript
?   ??? api-gateway/         # Backend Node.js/Express
?   ??? admin-panel/         # Panel administrativo
?   ??? automation/          # Scripts de automatización
?   ??? db/                  # Base de datos y migraciones
??? start-backend.bat        # Script para iniciar backend
??? start-frontend.bat       # Script para iniciar frontend
??? DASHBOARD-FIX-README.md  # Documentación de correcciones
```

## ??? Tecnologías Utilizadas

### Frontend
- **React 18** con TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **Shadcn/ui** para componentes
- **React Router** para navegación
- **Date-fns** para manejo de fechas
- **Recharts** para gráficos

### Backend
- **Node.js** con Express
- **MySQL** como base de datos
- **JWT** para autenticación
- **Socket.IO** para tiempo real
- **Webhooks** para integraciones
- **Arquitectura modular** (controladores, rutas, servicios)

## ?? Inicio Rápido

### Prerrequisitos

- Node.js (v18 o superior)
- MySQL (v8 o superior)
- Git

### Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/citaly-dashboard.git
   cd citaly-dashboard
   ```

2. **Configurar Base de Datos:**
   ```bash
   # Crear base de datos en MySQL
   mysql -u root -p
   CREATE DATABASE citaly_db;

   # Importar esquema
   mysql -u root -p citaly_db < app-citaly/db/sql.sql
   ```

3. **Configurar Backend:**
   ```bash
   cd app-citaly/api-gateway
   npm install

   # Configurar variables de entorno (crear .env)
   cp .env.example .env
   # Editar .env con tus credenciales de base de datos
   ```

4. **Configurar Frontend:**
   ```bash
   cd ../client-app
   npm install
   ```

### Ejecutar el Proyecto

#### Opción 1: Scripts Automáticos (Windows)
```bash
# Terminal 1: Backend
start-backend.bat

# Terminal 2: Frontend
start-frontend.bat
```

#### Opción 2: Manual
```bash
# Terminal 1: Backend
cd app-citaly/api-gateway
npm start

# Terminal 2: Frontend
cd app-citaly/client-app
npm run dev
```

### Acceso
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

## ?? Dashboard

El dashboard incluye:

- ?? **Estadísticas en Tiempo Real** - Ingresos, citas totales, tasa de completitud
- ?? **Próximas Citas** - Vista del día actual
- ?? **Servicios Populares** - Los más solicitados
- ?? **Gráficos Interactivos** - Visualización de datos
- ? **Modo Prueba** - Funciona sin backend con datos de ejemplo

## ??? Base de Datos

### Tablas Principales

- `empresas` - Información de clínicas/consultorios
- `usuarios` - Sistema de usuarios (admin/personal/clientes)
- `clientes` - Información detallada de pacientes
- `servicios` - Catálogo de servicios médicos
- `especialidades` - Especialidades médicas
- `citas` - Programación de citas
- `personal` - Gestión de staff médico
- `suscripciones` - Sistema de facturación (SaaS)

### Características de la BD

- ? **Multi-tenant** - Soporte para múltiples empresas
- ? **Auditoría** - Historial de cambios
- ? **Facturación** - Sistema SaaS completo
- ? **Notificaciones** - Sistema de alertas
- ? **Reportes** - Datos para analytics

## ?? API Endpoints

### Principales Módulos

```
/api/appointments     # Gestión de citas
/api/clients         # Gestión de clientes
/api/staff           # Gestión de personal
/api/services        # Gestión de servicios
/api/specialties     # Gestión de especialidades
/api/reports         # Reportes y estadísticas
/api/search          # Búsqueda global
/health              # Health check
```

## ??? Funcionalidades de Seguridad

- ?? **Autenticación JWT**
- ??? **Autorización por roles**
- ?? **Validación de datos**
- ?? **Auditoría de acciones**
- ?? **Manejo de errores**

## ?? Estado del Proyecto

### ? Completado
- Migración y modularización del backend
- Dashboard con manejo robusto de errores
- Gestión completa de entidades principales
- Base de datos normalizada
- Scripts de inicio automatizados

### ?? En Desarrollo
- Integración completa de Socket.IO
- Sistema de notificaciones en tiempo real
- Módulo de reportes avanzados
- Tests unitarios y de integración

### ?? Por Hacer
- Documentación API con Swagger
- Sistema de respaldos automáticos
- Módulo de facturación completo
- App móvil (React Native)

## ?? Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## ?? Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## ?? Autores

- **Tu Nombre** - *Desarrollo inicial* - [TuGitHub](https://github.com/tu-usuario)

## ?? Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa la [documentación de correcciones](DASHBOARD-FIX-README.md)
2. Abre un [issue](https://github.com/tu-usuario/citaly-dashboard/issues)
3. Contacta al equipo de desarrollo

## ?? Documentación Adicional

- [Guía de Correcciones del Dashboard](DASHBOARD-FIX-README.md)
- [Esquema de Base de Datos](app-citaly/db/sql.sql)
- [Configuración del API](app-citaly/api-gateway/README.md)

---

? **¡Dale una estrella si este proyecto te fue útil!** ?
