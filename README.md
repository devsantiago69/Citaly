# Citaly - Sistema de Gestión de Citas con Google Calendar

Sistema completo de gestión de citas médicas y de servicios con integración bidireccional con Google Calendar.

## 🚀 Características Principales

### ✅ Gestión de Citas
- Calendario interactivo con vista mensual
- Creación, edición y cancelación de citas
- Estados de cita (programada, confirmada, completada, cancelada)
- Notificaciones y recordatorios automáticos

### ✅ Integración Google Calendar
- **Sincronización bidireccional** con Google Calendar
- **Múltiples calendarios** por usuario
- **Sincronización automática** configurable
- **Resolución de conflictos** inteligente
- **Webhooks** para cambios en tiempo real

### ✅ Gestión de Usuarios
- Clientes con información médica completa
- Personal con especialidades y servicios
- Tipos de usuario con permisos granulares
- Autenticación segura con Supabase Auth

### ✅ Servicios y Categorías
- Catálogo completo de servicios
- Categorías personalizables
- Precios por sucursal
- Especialidades del personal

### ✅ Reportes y Analytics
- Dashboard con métricas en tiempo real
- Reportes de ingresos y rendimiento
- Exportación a PDF, Excel y CSV
- Gráficos interactivos

## 🛠️ Tecnologías

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI**: shadcn/ui + Tailwind CSS
- **Autenticación**: Supabase Auth
- **Base de datos**: PostgreSQL con RLS
- **API Externa**: Google Calendar API
- **Gráficos**: Recharts

## 📋 Configuración Inicial

### 1. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Copia las credenciales del proyecto
3. Ejecuta las migraciones de base de datos

### 2. Configurar Google Calendar API

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la Google Calendar API
4. Crea credenciales OAuth 2.0:
   - Tipo: Aplicación web
   - URIs de redirección: `http://localhost:5173/auth/google/callback`
5. Copia el Client ID y Client Secret

### 3. Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Google Calendar
VITE_GOOGLE_CLIENT_ID=tu_google_client_id
VITE_GOOGLE_CLIENT_SECRET=tu_google_client_secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

### 4. Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## 🔄 Flujo de Sincronización Google Calendar

### Configuración Inicial
1. Usuario autoriza acceso a Google Calendar
2. Sistema obtiene tokens de acceso y refresh
3. Se listan calendarios disponibles
4. Usuario selecciona calendarios a sincronizar

### Sincronización Automática
1. **Importación**: Eventos de Google → Citas en Citaly
2. **Exportación**: Citas de Citaly → Eventos en Google
3. **Bidireccional**: Ambas direcciones según configuración

### Resolución de Conflictos
- **Manual**: Usuario decide qué cambio mantener
- **Google gana**: Prioridad a cambios en Google Calendar
- **Sistema gana**: Prioridad a cambios en Citaly
- **Más reciente gana**: Prioridad al cambio más reciente

### Webhooks en Tiempo Real
- Google notifica cambios instantáneamente
- Sistema programa sincronización automática
- Logs detallados de todas las operaciones

## 📊 Estructura de Base de Datos

### Tablas Principales
- `empresas` - Información de empresas
- `usuarios` - Usuarios del sistema
- `citas` - Citas y eventos
- `servicios` - Catálogo de servicios
- `clientes` - Información de clientes

### Tablas Google Calendar
- `google_calendars` - Calendarios sincronizados
- `google_events` - Eventos importados
- `calendar_sync_logs` - Historial de sincronización
- `sync_configuration` - Configuración por empresa

## 🔐 Seguridad

- **Row Level Security (RLS)** en todas las tablas
- **Políticas granulares** basadas en empresa y usuario
- **Tokens encriptados** para Google Calendar
- **Autenticación JWT** con Supabase
- **Permisos por tipo de usuario**

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm run preview
```

### Supabase Edge Functions
```bash
# Desplegar funciones
supabase functions deploy google-calendar-sync
supabase functions deploy google-calendar-webhook
```

## 📱 Características de la Integración

### Para Clientes
- Ver sus citas en Google Calendar
- Crear eventos que se convierten en citas
- Recibir recordatorios en todos sus dispositivos
- Sincronización automática

### Para Personal
- Ver agenda completa en Google Calendar
- Actualizar citas desde cualquier dispositivo
- Notificaciones push nativas
- Integración con otros calendarios

### Para Administradores
- Control total de sincronización
- Configuración de conflictos
- Logs detallados de operaciones
- Métricas de uso de calendarios

## 🔧 Configuración Avanzada

### Intervalos de Sincronización
- Mínimo: 5 minutos
- Máximo: 24 horas
- Recomendado: 15 minutos

### Ventana de Sincronización
- Configurable de 7 a 365 días
- Por defecto: 30 días hacia adelante y atrás

### Tipos de Eventos Sincronizados
- Citas médicas
- Consultas
- Terapias
- Evaluaciones
- Eventos personalizados

## 📞 Soporte

Para soporte técnico o preguntas sobre la integración:
- Email: soporte@citaly.com
- Documentación: [docs.citaly.com](https://docs.citaly.com)
- Issues: GitHub Issues

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.