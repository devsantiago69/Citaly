# Documentaci�n de Rutas API - Citaly v3.0.0

## Rutas de la Nueva Estructura (Estructura BD Actualizada)

### Sucursales
- **Base URL**: `/api/sucursales`
- **Funcionalidades**:
  - CRUD completo de sucursales
  - Asignaci�n de personal a sucursales
  - Gesti�n de configuraciones por sucursal

### Cajas y Sesiones de Caja
- **Base URL**: `/api/cajas`
- **Funcionalidades**:
  - Gesti�n de cajas registradoras
  - Apertura y cierre de sesiones de caja
  - Movimientos de caja (ingresos, egresos)
  - Arqueos y cuadres

### Clientes (Nueva Estructura)
- **Base URL**: `/api/clientes`
- **Funcionalidades**:
  - CRUD de clientes con nueva estructura
  - Gesti�n de suscripciones
  - Historial de citas y pagos
  - Datos de contacto y preferencias

### Personal
- **Base URL**: `/api/personal`
- **Funcionalidades**:
  - Gesti�n de empleados/staff
  - Asignaci�n de especialidades
  - Roles y permisos
  - Horarios y disponibilidad

### Facturaci�n y Suscripciones
- **Base URL**: `/api/facturacion`
- **Funcionalidades**:
  - Sistema completo de facturaci�n
  - Gesti�n de suscripciones
  - Planes y precios
  - Historial de pagos
  - Reportes financieros

### Citas (Nueva Estructura)
- **Base URL**: `/api/citas-new`
- **Funcionalidades**:
  - Sistema de citas con nueva estructura
  - Integraci�n con sucursales
  - Asignaci�n de personal espec�fico
  - Estados y seguimiento avanzado

### Servicios (Nueva Estructura)
- **Base URL**: `/api/servicios-new`
- **Funcionalidades**:
  - Servicios con categor�as
  - Precios diferenciados por sucursal
  - Duraci�n y configuraciones espec�ficas

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

### B�squeda
- **Base URL**: `/api/busqueda`

### Tiempo Real y Webhooks
- **Base URL**: `/api/realtime`

### Especialidades del Personal
- **Base URL**: `/api/staff`

## Rutas del Sistema

### Health Check
- **GET** `/health` - Estado del servidor
- **GET** `/` - Informaci�n b�sica del API

## Notas de Migraci�n

1. **Versi�n**: El servidor ahora est� en la versi�n 3.0.0
2. **Nueva Estructura**: Todas las rutas nuevas siguen la estructura actualizada de la base de datos
3. **Compatibilidad**: Las rutas anteriores se mantienen para facilitar la transici�n
4. **Recomendaci�n**: Migrar gradualmente a las nuevas rutas para aprovechar todas las funcionalidades

## Features Habilitadas

- ? Socket.IO para tiempo real
- ? Sistema de Webhooks
- ? Autenticaci�n JWT
- ? Logging avanzado
- ? CORS configurado
- ? Manejo de errores centralizado

---

**Fecha de actualizaci�n**: $(date)
**Versi�n**: 3.0.0
**Estado**: Estructura completamente migrada
