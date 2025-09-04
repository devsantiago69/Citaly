-- Migración para agregar Google Calendar Integration a la base de datos MySQL existente
-- Ejecutar después de sql.sql

USE citaly;

-- Tabla para calendarios de Google sincronizados
CREATE TABLE google_calendars (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    google_calendar_id VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    zona_horaria VARCHAR(100) DEFAULT 'America/Bogota',
    es_principal BOOLEAN DEFAULT FALSE,
    sincronizacion_activa BOOLEAN DEFAULT TRUE,
    direccion_sincronizacion ENUM('bidireccional', 'solo_importar', 'solo_exportar') DEFAULT 'bidireccional',
    ultimo_sync TIMESTAMP NULL,
    access_token TEXT, -- Encrypted
    refresh_token TEXT, -- Encrypted
    token_expiry TIMESTAMP NULL,
    configuracion JSON,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT,
    actualizado_por BIGINT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_calendar (usuario_id, google_calendar_id),
    INDEX idx_empresa_usuario (empresa_id, usuario_id),
    INDEX idx_sincronizacion (sincronizacion_activa, ultimo_sync)
);

-- Agregar campos de Google Calendar a la tabla citas existente
ALTER TABLE citas ADD COLUMN google_calendar_id BIGINT NULL AFTER observaciones;
ALTER TABLE citas ADD COLUMN google_event_id VARCHAR(255) NULL AFTER google_calendar_id;
ALTER TABLE citas ADD COLUMN sync_status ENUM('sincronizado', 'pendiente', 'error', 'conflicto') DEFAULT 'pendiente' AFTER google_event_id;
ALTER TABLE citas ADD COLUMN sync_error TEXT NULL AFTER sync_status;
ALTER TABLE citas ADD COLUMN last_sync TIMESTAMP NULL AFTER sync_error;

-- Agregar índices para mejor rendimiento
ALTER TABLE citas ADD INDEX idx_google_event (google_event_id);
ALTER TABLE citas ADD INDEX idx_sync_status (sync_status);
ALTER TABLE citas ADD FOREIGN KEY (google_calendar_id) REFERENCES google_calendars(id) ON DELETE SET NULL;

-- Tabla para eventos sincronizados de Google Calendar
CREATE TABLE google_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    google_calendar_id BIGINT NOT NULL,
    cita_id BIGINT NULL,
    google_event_id VARCHAR(255) NOT NULL,
    titulo VARCHAR(500) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    zona_horaria VARCHAR(100) DEFAULT 'America/Bogota',
    es_todo_el_dia BOOLEAN DEFAULT FALSE,
    ubicacion TEXT,
    estado ENUM('confirmado', 'tentativo', 'cancelado') DEFAULT 'confirmado',
    visibilidad ENUM('publico', 'privado', 'confidencial') DEFAULT 'privado',
    asistentes JSON,
    recordatorios JSON,
    recurrencia JSON,
    metadata_google JSON,
    sync_status ENUM('sincronizado', 'pendiente', 'error', 'conflicto') DEFAULT 'sincronizado',
    sync_direction ENUM('importado', 'exportado', 'bidireccional') DEFAULT 'importado',
    last_modified TIMESTAMP NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (google_calendar_id) REFERENCES google_calendars(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL,
    UNIQUE KEY unique_calendar_event (google_calendar_id, google_event_id),
    INDEX idx_fecha_inicio (fecha_inicio),
    INDEX idx_sync_status (sync_status),
    INDEX idx_cita_id (cita_id)
);

-- Tabla para logs de sincronización
CREATE TABLE calendar_sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    google_calendar_id BIGINT NOT NULL,
    tipo_operacion ENUM('import', 'export', 'update', 'delete', 'conflict_resolution') NOT NULL,
    estado ENUM('exitoso', 'error', 'parcial') NOT NULL,
    detalles JSON,
    eventos_procesados INT DEFAULT 0,
    eventos_exitosos INT DEFAULT 0,
    eventos_con_error INT DEFAULT 0,
    tiempo_inicio TIMESTAMP NOT NULL,
    tiempo_fin TIMESTAMP NULL,
    duracion_ms INT NULL,
    error_message TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (google_calendar_id) REFERENCES google_calendars(id) ON DELETE CASCADE,
    INDEX idx_google_calendar (google_calendar_id),
    INDEX idx_fecha_operacion (tiempo_inicio),
    INDEX idx_estado (estado)
);

-- Tabla para configuración de sincronización por empresa
CREATE TABLE sync_configuration (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT NOT NULL,
    auto_sync_enabled BOOLEAN DEFAULT TRUE,
    sync_interval_minutes INT DEFAULT 15,
    conflict_resolution ENUM('google_wins', 'system_wins', 'manual', 'newest_wins') DEFAULT 'manual',
    sync_window_days INT DEFAULT 30, -- Días hacia adelante y atrás para sincronizar
    default_event_duration INT DEFAULT 60, -- Duración por defecto en minutos
    timezone VARCHAR(100) DEFAULT 'America/Bogota',
    configuracion JSON,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT,
    actualizado_por BIGINT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_empresa_config (empresa_id)
);

-- Insertar configuración por defecto para empresa demo
INSERT INTO sync_configuration (empresa_id, auto_sync_enabled, sync_interval_minutes, conflict_resolution, sync_window_days)
SELECT id, TRUE, 15, 'manual', 30 
FROM empresas 
WHERE nombre = 'Clínica Demo' OR nombre LIKE '%demo%' 
LIMIT 1;

-- Agregar permisos de Google Calendar a funcionalidades
INSERT INTO funcionalidades (nombre, clave, descripcion, modulo, activo) VALUES
('Google Calendar Sync', 'google_calendar_sync', 'Sincronizar con Google Calendar', 'calendar', TRUE),
('Google Calendar Read', 'google_calendar_read', 'Ver calendarios de Google', 'calendar', TRUE),
('Google Calendar Write', 'google_calendar_write', 'Modificar calendarios de Google', 'calendar', TRUE),
('Google Calendar Config', 'google_calendar_config', 'Configurar sincronización de Google Calendar', 'calendar', TRUE);

-- Trigger para actualizar estadísticas de usuario cuando cambian citas
DELIMITER //
CREATE TRIGGER update_user_stats_after_cita_insert
AFTER INSERT ON citas
FOR EACH ROW
BEGIN
    UPDATE usuarios u
    JOIN clientes c ON u.id = c.usuario_id
    SET u.total_citas = (
        SELECT COUNT(*) FROM citas ct
        WHERE ct.cliente_id = c.id
    ),
    u.citas_completadas = (
        SELECT COUNT(*) FROM citas ct
        WHERE ct.cliente_id = c.id AND ct.estado = 'completada'
    ),
    u.citas_canceladas = (
        SELECT COUNT(*) FROM citas ct
        WHERE ct.cliente_id = c.id AND ct.estado = 'cancelada'
    ),
    u.total_gastado = (
        SELECT COALESCE(SUM(ct.precio_final), 0) FROM citas ct
        WHERE ct.cliente_id = c.id AND ct.estado = 'completada'
    )
    WHERE c.id = NEW.cliente_id;
END//

CREATE TRIGGER update_user_stats_after_cita_update
AFTER UPDATE ON citas
FOR EACH ROW
BEGIN
    UPDATE usuarios u
    JOIN clientes c ON u.id = c.usuario_id
    SET u.total_citas = (
        SELECT COUNT(*) FROM citas ct
        WHERE ct.cliente_id = c.id
    ),
    u.citas_completadas = (
        SELECT COUNT(*) FROM citas ct
        WHERE ct.cliente_id = c.id AND ct.estado = 'completada'
    ),
    u.citas_canceladas = (
        SELECT COUNT(*) FROM citas ct
        WHERE ct.cliente_id = c.id AND ct.estado = 'cancelada'
    ),
    u.total_gastado = (
        SELECT COALESCE(SUM(ct.precio_final), 0) FROM citas ct
        WHERE ct.cliente_id = c.id AND ct.estado = 'completada'
    )
    WHERE c.id = NEW.cliente_id OR c.id = OLD.cliente_id;
END//
DELIMITER ;

-- Crear vista para estadísticas de sincronización
CREATE VIEW sync_stats AS
SELECT 
    gc.empresa_id,
    gc.usuario_id,
    gc.nombre as calendar_name,
    COUNT(ge.id) as total_events,
    COUNT(CASE WHEN ge.sync_status = 'sincronizado' THEN 1 END) as synced_events,
    COUNT(CASE WHEN ge.sync_status = 'error' THEN 1 END) as error_events,
    MAX(gc.ultimo_sync) as last_sync,
    gc.sincronizacion_activa
FROM google_calendars gc
LEFT JOIN google_events ge ON gc.id = ge.google_calendar_id
GROUP BY gc.id;

COMMIT;
