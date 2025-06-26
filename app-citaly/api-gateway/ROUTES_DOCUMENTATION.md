# Documentación de Rutas API - Citaly v3.0.0

## Rutas de la Nueva Estructura (Estructura BD Actualizada)

### Sucursales
- **Base URL**: `/api/sucursales`
- **Funcionalidades**:
  - CRUD completo de sucursales
  - Asignación de personal a sucursales
  - Gestión de configuraciones por sucursal

### Cajas y Sesiones de Caja
- **Base URL**: `/api/cajas`
- **Funcionalidades**:
  - Gestión de cajas registradoras
  - Apertura y cierre de sesiones de caja
  - Movimientos de caja (ingresos, egresos)
  - Arqueos y cuadres

### Clientes (Nueva Estructura)
- **Base URL**: `/api/clientes`
- **Funcionalidades**:
  - CRUD de clientes con nueva estructura
  - Gestión de suscripciones
  - Historial de citas y pagos
  - Datos de contacto y preferencias

### Personal
- **Base URL**: `/api/personal`
- **Funcionalidades**:
  - Gestión de empleados/staff
  - Asignación de especialidades
  - Roles y permisos
  - Horarios y disponibilidad

### Facturación y Suscripciones
- **Base URL**: `/api/facturacion`
- **Funcionalidades**:
  - Sistema completo de facturación
  - Gestión de suscripciones
  - Planes y precios
  - Historial de pagos
  - Reportes financieros

### Citas (Nueva Estructura)
- **Base URL**: `/api/citas-new`
- **Funcionalidades**:
  - Sistema de citas con nueva estructura
  - Integración con sucursales
  - Asignación de personal específico
  - Estados y seguimiento avanzado

### Servicios (Nueva Estructura)
- **Base URL**: `/api/servicios-new`
- **Funcionalidades**:
  - Servicios con categorías
  - Precios diferenciados por sucursal
  - Duración y configuraciones específicas

## Rutas de Compatibilidad (Estructura Anterior)

### Citas/Appointments (Compatibilidad)
- **Base URL**: `/api/appointments`
- **Nota**: Mantenida para compatibilidad con frontend existente

### Usuarios (Compatibilidad)
- **Base URL**: `/api/users`
- **Nota**: Estructura anterior de usuarios

### Servicios (Compatibilidad)
- **Base URL**: `/api/services`
- **Nota**: Estructura anterior de servicios

## Rutas de Sistema y Utilidades

### Especialidades
- **Base URL**: `/api/specialties`

### Tipos de Usuario
- **Base URL**: `/api/user-types`

### Sistema
- **Base URL**: `/api/sistema`

### Reportes
- **Base URL**: `/api/reports`

### Búsqueda
- **Base URL**: `/api/busqueda`

### Tiempo Real y Webhooks
- **Base URL**: `/api/realtime`

### Especialidades del Personal
- **Base URL**: `/api/staff`

## Rutas del Sistema

### Health Check
- **GET** `/health` - Estado del servidor
- **GET** `/` - Información básica del API

## Notas de Migración

1. **Versión**: El servidor ahora está en la versión 3.0.0
2. **Nueva Estructura**: Todas las rutas nuevas siguen la estructura actualizada de la base de datos
3. **Compatibilidad**: Las rutas anteriores se mantienen para facilitar la transición
4. **Recomendación**: Migrar gradualmente a las nuevas rutas para aprovechar todas las funcionalidades

## Features Habilitadas

- ? Socket.IO para tiempo real
- ? Sistema de Webhooks
- ? Autenticación JWT
- ? Logging avanzado
- ? CORS configurado
- ? Manejo de errores centralizado

---

**Fecha de actualización**: $(date)
**Versión**: 3.0.0
**Estado**: Estructura completamente migrada
