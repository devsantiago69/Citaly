CREATE TABLE super_administradores (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    correo_electronico VARCHAR(100) UNIQUE,
    contrasena VARCHAR(255),
    rol VARCHAR(50) DEFAULT 'Super_admin' COMMENT 'Rol del administrador',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE empresas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255),
    nit VARCHAR(100),
    direccion VARCHAR(255),
    telefono VARCHAR(50),
    correo_electronico VARCHAR(100),
    descripcion TEXT,
    sitio_web VARCHAR(255),
    industria VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT,
    FOREIGN KEY (creado_por) REFERENCES super_administradores(id)
);

CREATE TABLE auditorias_empresa (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    super_admin_id BIGINT,
    accion ENUM('Crear', 'Actualizar', 'Suspender', 'Eliminar') COMMENT 'Acción realizada',
    motivo TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (super_admin_id) REFERENCES super_administradores(id)
);

CREATE TABLE planes_facturacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    ciclo_facturacion ENUM('Mensual', 'Anual') DEFAULT 'Mensual',
    maximo_citas INT DEFAULT 0,
    maximo_personal INT DEFAULT 0,
    maximo_clientes INT DEFAULT 0,
    maximo_servicios INT DEFAULT 0,
    limite_almacenamiento_gb INT DEFAULT 1,
    nivel_soporte ENUM('Basico', 'Estandar', 'Premium') DEFAULT 'Basico',
    marca_personalizada BOOLEAN DEFAULT FALSE,
    acceso_api BOOLEAN DEFAULT FALSE,
    reportes_avanzados BOOLEAN DEFAULT FALSE,
    integraciones_permitidas TEXT COMMENT 'JSON con nombres de integraciones',
    activo BOOLEAN DEFAULT TRUE,
    dias_prueba INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE funcionalidades (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    clave VARCHAR(100) UNIQUE,
    descripcion TEXT,
    modulo VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE plan_funcionalidades (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_id BIGINT,
    funcionalidad_id BIGINT,
    limite INT,
    habilitado BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (plan_id) REFERENCES planes_facturacion(id),
    FOREIGN KEY (funcionalidad_id) REFERENCES funcionalidades(id)
);

CREATE TABLE suscripciones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    plan_id BIGINT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('Activa', 'Inactiva', 'Cancelada', 'Expirada', 'Suspendida') DEFAULT 'Activa',
    metodo_pago VARCHAR(100),
    renovacion_automatica BOOLEAN DEFAULT TRUE,
    dias_gracia INT DEFAULT 7,
    motivo_suspension TEXT,
    prueba_usada BOOLEAN DEFAULT FALSE,
    creado_por BIGINT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (plan_id) REFERENCES planes_facturacion(id),
    FOREIGN KEY (creado_por) REFERENCES super_administradores(id),
    INDEX idx_empresa_estado (empresa_id, estado),
    INDEX idx_fecha_fin (fecha_fin)
);
CREATE TABLE facturas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    suscripcion_id BIGINT,
    numero_factura VARCHAR(50) UNIQUE,
    monto DECIMAL(10,2) NOT NULL,
    monto_impuestos DECIMAL(10,2) DEFAULT 0.00,
    monto_total DECIMAL(10,2) GENERATED ALWAYS AS (monto + monto_impuestos) STORED,
    estado ENUM('Pagada', 'No_pagada', 'Vencida', 'Cancelada') DEFAULT 'No_pagada',
    fecha_vencimiento DATE NOT NULL,
    fecha_pago DATETIME NULL,
    metodo_pago VARCHAR(100),
    referencia_pago VARCHAR(255),
    notas TEXT,
    ruta_pdf VARCHAR(500),
    id_transaccion_externa VARCHAR(255) NULL COMMENT 'ID del pago reportado por el cliente',
    revisado_por_admin BOOLEAN DEFAULT FALSE COMMENT 'Indica si un administrador ya revisó este pago manual',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id),
    INDEX idx_estado_vencimiento (estado, fecha_vencimiento),
    INDEX idx_empresa (empresa_id)
);

CREATE TABLE tipos_usuario (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    permisos JSON COMMENT 'Permisos específicos para este tipo',
    nivel ENUM('Admin', 'Personal', 'Cliente') NOT NULL,
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id),
    INDEX idx_empresa_estado (empresa_id, estado),
    INDEX idx_nivel (nivel)
);

CREATE TABLE usuarios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    tipo_usuario_id BIGINT,
    nombre VARCHAR(100),
    correo_electronico VARCHAR(100),
    contrasena VARCHAR(255),
    rol ENUM('Admin', 'Personal', 'Cliente'),
    telefono VARCHAR(50),
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (tipo_usuario_id) REFERENCES tipos_usuario(id),
    FOREIGN KEY (creado_por) REFERENCES super_administradores(id)
);


CREATE TABLE tipos_usuario (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    permisos JSON COMMENT 'Permisos específicos para este tipo',
    nivel ENUM('Admin', 'Personal', 'Cliente') NOT NULL,
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (creado_por) REFERENCES super_administradores(id)
);

CREATE TABLE personal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    usuario_id BIGINT,
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    calificacion DECIMAL(3,2),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE servicios_personal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    personal_id BIGINT,
    servicio_id BIGINT,
    principal BOOLEAN DEFAULT FALSE COMMENT 'Indica si este es su servicio principal',
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (personal_id) REFERENCES personal(id),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id),
    UNIQUE KEY unico_personal_servicio (personal_id, servicio_id),
    INDEX idx_personal (personal_id),
    INDEX idx_servicio (servicio_id)
);

CREATE TABLE horarios_personal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    personal_id BIGINT,
    dia ENUM('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    comentario TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (personal_id) REFERENCES personal(id),
    INDEX idx_personal_dia (personal_id, dia)
);

CREATE TABLE categorias_servicio (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    nombre VARCHAR(100),
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE TABLE servicios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    categoria_id BIGINT,
    nombre VARCHAR(100),
    descripcion TEXT,
    duracion INT COMMENT 'Duración en minutos',
    precio DECIMAL(10,2),
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias_servicio(id)
);

CREATE TABLE citas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    cliente_id BIGINT,
    personal_id BIGINT,
    servicio_id BIGINT,
    fecha DATE,
    hora TIME,
    estado ENUM('Programada', 'Completada', 'Cancelada', 'Confirmada', 'Pendiente', 'En_progreso') DEFAULT 'Programada',
    notas TEXT,
    canal ENUM('Online', 'Presencial', 'Telefono', 'Whatsapp') DEFAULT 'Presencial',
    id_evento_google VARCHAR(255),
    origen ENUM('Presencial', 'Automatica', 'Whatsapp', 'N8N', 'Telefono') DEFAULT 'Presencial' COMMENT 'Origen de la solicitud de la cita',
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
    FOREIGN KEY (personal_id) REFERENCES usuarios(id),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id)
);

CREATE TABLE clientes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,

    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    tipo_documento ENUM('RUT', 'DNI', 'PASAPORTE', 'OTRO') DEFAULT 'DNI',
    numero_documento VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE,
    genero ENUM('Masculino', 'Femenino', 'Otro') DEFAULT 'Otro',

    correo_electronico VARCHAR(100) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    telefono_alternativo VARCHAR(50),
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    departamento VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'Chile',

    contacto_emergencia_nombre VARCHAR(200),
    contacto_emergencia_telefono VARCHAR(50),
    relacion_emergencia VARCHAR(100),

    tipo_sangre VARCHAR(5),
    alergias TEXT,
    medicamentos_actuales TEXT,
    condiciones_medicas TEXT,
    notas_medicas TEXT,
    fecha_ultimo_chequeo DATE,

    citas_totales INT DEFAULT 0,
    citas_completadas INT DEFAULT 0,
    citas_canceladas INT DEFAULT 0,
    total_gastado DECIMAL(10,2) DEFAULT 0.00,
    ultima_visita DATE,
    calificacion_promedio DECIMAL(3,2),

    personal_preferido_id BIGINT,
    horario_preferido TEXT,
    preferencias_comunicacion SET('Correo', 'SMS', 'Whatsapp', 'Telefono'),
    estado ENUM('Activo', 'Inactivo', 'Bloqueado') DEFAULT 'Activo',

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT,
    actualizado_por BIGINT,

    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (personal_preferido_id) REFERENCES personal(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id),
    FOREIGN KEY (actualizado_por) REFERENCES usuarios(id),

    INDEX idx_documento (tipo_documento, numero_documento),
    INDEX idx_correo (correo_electronico),
    INDEX idx_telefono (telefono),
    INDEX idx_estado (estado)
);

CREATE TABLE recordatorios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    nombre VARCHAR(255),
    canal ENUM('Whatsapp', 'Correo', 'SMS'),
    tiempo INT,
    unidad ENUM('Minutos', 'Horas', 'Dias'),
    mensaje TEXT,
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE TABLE tokens_google (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT,
    token_acceso TEXT,
    token_refresco TEXT,
    expira_en DATETIME,
    id_calendario_google VARCHAR(255),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE logs_sincronizacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT,
    tipo_evento VARCHAR(100),
    id_evento_google VARCHAR(255),
    id_cita_local BIGINT,
    estado VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE casos_soporte (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    usuario_id BIGINT,
    asunto VARCHAR(255),
    descripcion TEXT,
    prioridad ENUM('Baja', 'Media', 'Alta') DEFAULT 'Media',
    estado INT DEFAULT 0 COMMENT '0: Abierto, 1: Cerrado',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE notificaciones_admin (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT,
    tipo VARCHAR(100),
    mensaje TEXT,
    enlace TEXT,
    estado ENUM('Leido', 'No_leido') DEFAULT 'No_leido',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE logs_sistema (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT,
    tipo_actor ENUM('Super_admin', 'Administrador_empresa', 'Usuario') DEFAULT 'Usuario',
    accion VARCHAR(255),
    ip VARCHAR(100),
    detalles TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE uso_funcionalidades_empresa (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    clave_funcionalidad VARCHAR(100),
    usado INT,
    limite INT,
    ultima_reset TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE TABLE codigos_activacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    plan_id BIGINT,
    empresa_id BIGINT NULL,
    duracion_meses INT DEFAULT 1,
    usos_maximos INT DEFAULT 1,
    usos_actuales INT DEFAULT 0,
    estado ENUM('Activo', 'Usado', 'Expirado', 'Deshabilitado') DEFAULT 'Activo',
    expira_en DATETIME,
    creado_por BIGINT,
    usado_por BIGINT NULL,
    usado_en DATETIME NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES planes_facturacion(id),
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (creado_por) REFERENCES super_administradores(id),
    FOREIGN KEY (usado_por) REFERENCES usuarios(id),
    INDEX idx_codigo_estado (codigo, estado),
    INDEX idx_expira (expira_en)
);

CREATE TABLE notificaciones_pago (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    suscripcion_id BIGINT,
    tipo ENUM('Pago_pendiente', 'Pago_vencido', 'Advertencia_suspension', 'Plan_expirado', 'Renovacion_exitosa') NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    prioridad ENUM('Baja', 'Media', 'Alta', 'Critica') DEFAULT 'Media',
    estado ENUM('Pendiente', 'Enviado', 'Leido', 'Descartado') DEFAULT 'Pendiente',
    programado_para DATETIME,
    enviado_en DATETIME NULL,
    leido_en DATETIME NULL,
    metadata JSON,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id),
    INDEX idx_empresa_estado (empresa_id, estado),
    INDEX idx_programado (programado_para)
);

CREATE TABLE cambios_plan (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    suscripcion_anterior_id BIGINT,
    suscripcion_nueva_id BIGINT,
    codigo_activacion_id BIGINT NULL,
    tipo_cambio ENUM('Actualizacion', 'Degradacion', 'Renovacion', 'Activacion') NOT NULL,
    motivo VARCHAR(500),
    fecha_efectiva DATE NOT NULL,
    nombre_plan_anterior VARCHAR(100),
    nombre_plan_nuevo VARCHAR(100),
    diferencia_precio DECIMAL(10,2),
    cambiado_por BIGINT,
    aprobado_por BIGINT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (suscripcion_anterior_id) REFERENCES suscripciones(id),
    FOREIGN KEY (suscripcion_nueva_id) REFERENCES suscripciones(id),
    FOREIGN KEY (codigo_activacion_id) REFERENCES codigos_activacion(id),
    FOREIGN KEY (cambiado_por) REFERENCES usuarios(id),
    FOREIGN KEY (aprobado_por) REFERENCES super_administradores(id)
);

CREATE TABLE especialidades (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id),
    INDEX idx_empresa_estado (empresa_id, estado)
);

CREATE TABLE especialidades_personal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    personal_id BIGINT,
    especialidad_id BIGINT,
    nivel_experiencia ENUM('Principiante', 'Intermedio', 'Avanzado', 'Experto') DEFAULT 'Intermedio',
    anios_experiencia INT DEFAULT 0,
    certificaciones TEXT,
    principal BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (personal_id) REFERENCES usuarios(id),
    FOREIGN KEY (especialidad_id) REFERENCES especialidades(id),
    UNIQUE KEY unico_personal_especialidad (personal_id, especialidad_id),
    INDEX idx_personal (personal_id),
    INDEX idx_especialidad (especialidad_id)
);
CREATE TABLE historial_cambios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entidad VARCHAR(100) NOT NULL COMMENT 'Tabla afectada',
    entidad_id BIGINT NOT NULL COMMENT 'ID del registro afectado',
    campo VARCHAR(100) NOT NULL COMMENT 'Campo modificado',
    valor_anterior TEXT COMMENT 'Valor antes del cambio',
    valor_nuevo TEXT COMMENT 'Valor después del cambio',
    realizado_por BIGINT NOT NULL COMMENT 'Usuario que realizó el cambio',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (realizado_por) REFERENCES usuarios(id),
    INDEX idx_entidad (entidad, entidad_id)
);