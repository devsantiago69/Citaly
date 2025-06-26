# ?? Citaly - Sistema de Gesti�n de Citas M�dicas

Sistema integral de gesti�n de citas m�dicas con dashboard administrativo, desarrollado con React/TypeScript (frontend) y Node.js/Express (backend).

## ?? Caracter�sticas Principales

- ? **Dashboard en Tiempo Real** - Visualizaci�n de estad�sticas y m�tricas
- ? **Gesti�n de Citas** - Programaci�n, confirmaci�n y seguimiento
- ? **Gesti�n de Pacientes** - Registro completo de clientes/pacientes
- ? **Gesti�n de Personal** - Administraci�n de staff m�dico
- ? **Gesti�n de Servicios** - Cat�logo de servicios m�dicos
- ? **Especialidades** - Manejo de especialidades m�dicas
- ? **Modo Offline** - Funciona con datos de prueba cuando no hay backend
- ? **API RESTful** - Backend modular y escalable
- ? **Base de Datos MySQL** - Esquema completo para gesti�n m�dica

## ?? Estructura del Proyecto

```
citaly/
??? app-citaly/
?   ??? client-app/          # Frontend React/TypeScript
?   ??? api-gateway/         # Backend Node.js/Express
?   ??? admin-panel/         # Panel administrativo
?   ??? automation/          # Scripts de automatizaci�n
?   ??? db/                  # Base de datos y migraciones
??? start-backend.bat        # Script para iniciar backend
??? start-frontend.bat       # Script para iniciar frontend
??? DASHBOARD-FIX-README.md  # Documentaci�n de correcciones
```

## ??? Tecnolog�as Utilizadas

### Frontend
- **React 18** con TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **Shadcn/ui** para componentes
- **React Router** para navegaci�n
- **Date-fns** para manejo de fechas
- **Recharts** para gr�ficos

### Backend
- **Node.js** con Express
- **MySQL** como base de datos
- **JWT** para autenticaci�n
- **Socket.IO** para tiempo real
- **Webhooks** para integraciones
- **Arquitectura modular** (controladores, rutas, servicios)

## ?? Inicio R�pido

### Prerrequisitos

- Node.js (v18 o superior)
- MySQL (v8 o superior)
- Git

### Instalaci�n

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

#### Opci�n 1: Scripts Autom�ticos (Windows)
```bash
# Terminal 1: Backend
start-backend.bat

# Terminal 2: Frontend
start-frontend.bat
```

#### Opci�n 2: Manual
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

- ?? **Estad�sticas en Tiempo Real** - Ingresos, citas totales, tasa de completitud
- ?? **Pr�ximas Citas** - Vista del d�a actual
- ?? **Servicios Populares** - Los m�s solicitados
- ?? **Gr�ficos Interactivos** - Visualizaci�n de datos
- ? **Modo Prueba** - Funciona sin backend con datos de ejemplo

## ??? Base de Datos

### Tablas Principales

- `empresas` - Informaci�n de cl�nicas/consultorios
- `usuarios` - Sistema de usuarios (admin/personal/clientes)
- `clientes` - Informaci�n detallada de pacientes
- `servicios` - Cat�logo de servicios m�dicos
- `especialidades` - Especialidades m�dicas
- `citas` - Programaci�n de citas
- `personal` - Gesti�n de staff m�dico
- `suscripciones` - Sistema de facturaci�n (SaaS)

### Caracter�sticas de la BD

- ? **Multi-tenant** - Soporte para m�ltiples empresas
- ? **Auditor�a** - Historial de cambios
- ? **Facturaci�n** - Sistema SaaS completo
- ? **Notificaciones** - Sistema de alertas
- ? **Reportes** - Datos para analytics

## ?? API Endpoints

### Principales M�dulos

```
/api/appointments     # Gesti�n de citas
/api/clients         # Gesti�n de clientes
/api/staff           # Gesti�n de personal
/api/services        # Gesti�n de servicios
/api/specialties     # Gesti�n de especialidades
/api/reports         # Reportes y estad�sticas
/api/search          # B�squeda global
/health              # Health check
```

## ??? Funcionalidades de Seguridad

- ?? **Autenticaci�n JWT**
- ??? **Autorizaci�n por roles**
- ?? **Validaci�n de datos**
- ?? **Auditor�a de acciones**
- ?? **Manejo de errores**

## ?? Estado del Proyecto

### ? Completado
- Migraci�n y modularizaci�n del backend
- Dashboard con manejo robusto de errores
- Gesti�n completa de entidades principales
- Base de datos normalizada
- Scripts de inicio automatizados

### ?? En Desarrollo
- Integraci�n completa de Socket.IO
- Sistema de notificaciones en tiempo real
- M�dulo de reportes avanzados
- Tests unitarios y de integraci�n

### ?? Por Hacer
- Documentaci�n API con Swagger
- Sistema de respaldos autom�ticos
- M�dulo de facturaci�n completo
- App m�vil (React Native)

## ?? Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## ?? Licencia

Este proyecto est� bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para m�s detalles.

## ?? Autores

- **Tu Nombre** - *Desarrollo inicial* - [TuGitHub](https://github.com/tu-usuario)

## ?? Soporte

Si encuentras alg�n problema o tienes preguntas:

1. Revisa la [documentaci�n de correcciones](DASHBOARD-FIX-README.md)
2. Abre un [issue](https://github.com/tu-usuario/citaly-dashboard/issues)
3. Contacta al equipo de desarrollo

## ?? Documentaci�n Adicional

- [Gu�a de Correcciones del Dashboard](DASHBOARD-FIX-README.md)
- [Esquema de Base de Datos](app-citaly/db/sql.sql)
- [Configuraci�n del API](app-citaly/api-gateway/README.md)

---

? **�Dale una estrella si este proyecto te fue �til!** ?
