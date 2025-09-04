-- Migración para Google Calendar Integration
-- Fecha: 2025-09-04
-- Versión: 1.0

-- Tabla para almacenar tokens de Google OAuth por usuario
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    empresa_id BIGINT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope TEXT,
    expiry_date TIMESTAMP NULL,
    google_user_email VARCHAR(255),
    google_user_id VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_google (usuario_id, google_user_id),
    INDEX idx_usuario_empresa (usuario_id, empresa_id),
    INDEX idx_google_user (google_user_id),
    INDEX idx_expiry (expiry_date)
);

-- Tabla para almacenar calendarios de Google sincronizados
CREATE TABLE IF NOT EXISTS google_calendars (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    empresa_id BIGINT NOT NULL,
    google_calendar_id VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    zona_horaria VARCHAR(100) DEFAULT 'America/Bogota',
    color_fondo VARCHAR(20),
    color_texto VARCHAR(20),
    es_primario BOOLEAN DEFAULT FALSE,
    es_propietario BOOLEAN DEFAULT FALSE,
    nivel_acceso ENUM('owner', 'writer', 'reader', 'freeBusyReader') DEFAULT 'reader',
    sincronizacion_activa BOOLEAN DEFAULT TRUE,
    sincronizar_eventos_entrantes BOOLEAN DEFAULT TRUE,
    sincronizar_eventos_salientes BOOLEAN DEFAULT TRUE,
    prefijo_eventos VARCHAR(50) DEFAULT '[Citaly]',
    webhook_channel_id VARCHAR(255),
    webhook_resource_id VARCHAR(255),
    webhook_expiration TIMESTAMP NULL,
    ultima_sincronizacion TIMESTAMP NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_calendar (usuario_id, google_calendar_id),
    INDEX idx_usuario_empresa (usuario_id, empresa_id),
    INDEX idx_google_calendar (google_calendar_id),
    INDEX idx_sincronizacion (sincronizacion_activa),
    INDEX idx_ultima_sync (ultima_sincronizacion)
);

-- Tabla para almacenar eventos de Google Calendar sincronizados
CREATE TABLE IF NOT EXISTS google_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    calendario_id BIGINT NOT NULL,
    cita_id BIGINT NULL,
    google_event_id VARCHAR(255) NOT NULL,
    google_calendar_id VARCHAR(255) NOT NULL,
    titulo VARCHAR(500) NOT NULL,
    descripcion TEXT,
    ubicacion VARCHAR(500),
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    zona_horaria VARCHAR(100) DEFAULT 'America/Bogota',
    es_todo_el_dia BOOLEAN DEFAULT FALSE,
    estado ENUM('confirmed', 'tentative', 'cancelled') DEFAULT 'confirmed',
    visibilidad ENUM('default', 'public', 'private', 'confidential') DEFAULT 'default',
    organizador_email VARCHAR(255),
    organizador_nombre VARCHAR(255),
    asistentes JSON COMMENT 'Array de asistentes con email, nombre y estado',
    recordatorios JSON COMMENT 'Array de recordatorios con método y minutos',
    recurrencia TEXT COMMENT 'Reglas de recurrencia RRULE',
    evento_padre_id VARCHAR(255) COMMENT 'ID del evento padre si es recurrente',
    fecha_actualizacion_google TIMESTAMP NOT NULL,
    sincronizado_desde_citaly BOOLEAN DEFAULT FALSE,
    sincronizado_hacia_citaly BOOLEAN DEFAULT FALSE,
    conflicto_detectado BOOLEAN DEFAULT FALSE,
    metadatos JSON COMMENT 'Información adicional del evento',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (calendario_id) REFERENCES google_calendars(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_google_event (google_event_id, google_calendar_id),
    INDEX idx_calendario (calendario_id),
    INDEX idx_cita (cita_id),
    INDEX idx_google_event (google_event_id),
    INDEX idx_fechas (fecha_inicio, fecha_fin),
    INDEX idx_estado (estado),
    INDEX idx_sincronizacion (sincronizado_desde_citaly, sincronizado_hacia_citaly),
    INDEX idx_conflictos (conflicto_detectado),
    INDEX idx_actualizacion_google (fecha_actualizacion_google)
);

-- Tabla para logs de sincronización
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    empresa_id BIGINT NOT NULL,
    calendario_id BIGINT NULL,
    tipo_operacion ENUM('sync_full', 'sync_incremental', 'create_event', 'update_event', 'delete_event', 'webhook') NOT NULL,
    direccion ENUM('citaly_to_google', 'google_to_citaly', 'bidirectional') NOT NULL,
    estado ENUM('iniciado', 'completado', 'error', 'cancelado') DEFAULT 'iniciado',
    eventos_procesados INT DEFAULT 0,
    eventos_creados INT DEFAULT 0,
    eventos_actualizados INT DEFAULT 0,
    eventos_eliminados INT DEFAULT 0,
    conflictos_detectados INT DEFAULT 0,
    errores_encontrados INT DEFAULT 0,
    tiempo_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tiempo_fin TIMESTAMP NULL,
    duracion_segundos INT NULL,
    mensaje_error TEXT,
    detalles JSON COMMENT 'Detalles adicionales de la sincronización',
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (calendario_id) REFERENCES google_calendars(id) ON DELETE SET NULL,
    
    INDEX idx_usuario_empresa (usuario_id, empresa_id),
    INDEX idx_calendario (calendario_id),
    INDEX idx_tipo_operacion (tipo_operacion),
    INDEX idx_estado (estado),
    INDEX idx_fecha (tiempo_inicio),
    INDEX idx_duracion (duracion_segundos)
);

-- Tabla para configuración de sincronización por empresa
CREATE TABLE IF NOT EXISTS sync_configuration (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT NOT NULL,
    auto_sync_enabled BOOLEAN DEFAULT TRUE,
    sync_interval_minutes INT DEFAULT 15,
    conflict_resolution ENUM('manual', 'citaly_wins', 'google_wins', 'most_recent') DEFAULT 'manual',
    sync_window_days INT DEFAULT 30 COMMENT 'Días hacia adelante y atrás para sincronizar',
    default_event_duration INT DEFAULT 60 COMMENT 'Duración por defecto de eventos en minutos',
    timezone VARCHAR(100) DEFAULT 'America/Bogota',
    webhook_enabled BOOLEAN DEFAULT TRUE,
    notificaciones_conflictos BOOLEAN DEFAULT TRUE,
    notificaciones_errores BOOLEAN DEFAULT TRUE,
    limite_eventos_por_sync INT DEFAULT 1000,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_empresa (empresa_id),
    INDEX idx_auto_sync (auto_sync_enabled),
    INDEX idx_webhook (webhook_enabled)
);

-- Tabla para mapeo de servicios con calendarios específicos
CREATE TABLE IF NOT EXISTS servicio_calendar_mapping (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    servicio_id BIGINT NOT NULL,
    google_calendar_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    es_calendar_por_defecto BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
    FOREIGN KEY (google_calendar_id) REFERENCES google_calendars(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_servicio_calendar (servicio_id, google_calendar_id),
    INDEX idx_servicio (servicio_id),
    INDEX idx_calendar (google_calendar_id),
    INDEX idx_usuario (usuario_id)
);

-- Agregar campos faltantes a la tabla citas si no existen
ALTER TABLE citas 
ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255) NULL AFTER id_evento_google,
ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255) NULL AFTER google_event_id,
ADD COLUMN IF NOT EXISTS sincronizado_con_google BOOLEAN DEFAULT FALSE AFTER google_calendar_id,
ADD COLUMN IF NOT EXISTS fecha_ultima_sync_google TIMESTAMP NULL AFTER sincronizado_con_google;

-- Índices adicionales para la tabla citas
ALTER TABLE citas 
ADD INDEX IF NOT EXISTS idx_google_event (google_event_id),
ADD INDEX IF NOT EXISTS idx_google_calendar (google_calendar_id),
ADD INDEX IF NOT EXISTS idx_sync_google (sincronizado_con_google);

-- Insertar configuración por defecto para empresas existentes
INSERT IGNORE INTO sync_configuration (empresa_id, auto_sync_enabled, sync_interval_minutes, conflict_resolution, sync_window_days, default_event_duration, timezone)
SELECT id, TRUE, 15, 'manual', 30, 60, 'America/Bogota'
FROM empresas;

-- Actualizar funcionalidades existentes
UPDATE funcionalidades 
SET descripcion = 'Sincronización bidireccional con Google Calendar, gestión de múltiples calendarios y eventos.'
WHERE clave = 'integracion_calendario';

COMMIT;
