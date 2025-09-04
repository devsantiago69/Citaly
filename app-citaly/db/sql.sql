-- Desactiva las comprobaciones de claves foráneas para permitir la carga de tablas en cualquier orden
SET FOREIGN_KEY_CHECKS = 0;

-- ########## 1. TABLAS CENTRALES (SIN DEPENDENCIAS EXTERNAS) ##########

CREATE TABLE super_administradores (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    correo_electronico VARCHAR(100) UNIQUE,
    contrasena VARCHAR(255),
    rol VARCHAR(50) DEFAULT 'Super_admin' COMMENT 'Rol del administrador',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE funcionalidades (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    clave VARCHAR(100) UNIQUE,
    descripcion TEXT,
    modulo VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL
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
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL
);

-- ########## 2. TABLAS DE ESTRUCTURA DE EMPRESA Y SUCURSALES ##########

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

-- NUEVA TABLA: Gestiona las diferentes sucursales de una empresa.
CREATE TABLE sucursales (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT NOT NULL,
    nombre VARCHAR(150) NOT NULL COMMENT 'Ej: Sede Principal, Sucursal Norte',
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    telefono VARCHAR(50),
    correo_electronico VARCHAR(100),
    estado ENUM('Activa', 'Inactiva', 'En_remodelacion') DEFAULT 'Activa',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    INDEX idx_empresa_estado (empresa_id, estado)
);

CREATE TABLE auditorias_empresa (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    super_admin_id BIGINT,
    accion ENUM('Crear', 'Actualizar', 'Suspender', 'Eliminar') COMMENT 'Accion realizada',
    motivo TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (super_admin_id) REFERENCES super_administradores(id)
);

CREATE TABLE plan_funcionalidades (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_id BIGINT,
    funcionalidad_id BIGINT,
    limite INT,
    habilitado BOOLEAN DEFAULT TRUE,
    creado_por BIGINT NULL,
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
    sucursal_id BIGINT NULL COMMENT 'Sucursal que emite la factura (Opcional)',
    suscripcion_id BIGINT,
    numero_factura VARCHAR(50) UNIQUE,
    monto DECIMAL(10,2) NOT NULL,
    monto_impuestos DECIMAL(10,2) DEFAULT 0.00,
    monto_total DECIMAL(12,2) GENERATED ALWAYS AS (monto + monto_impuestos) STORED,
    estado ENUM('Pagada', 'No_pagada', 'Vencida', 'Cancelada') DEFAULT 'No_pagada',
    fecha_vencimiento DATE NOT NULL,
    fecha_pago DATETIME NULL,
    medio_pago_id VARCHAR(100),
    referencia_pago VARCHAR(255),
    notas TEXT,
    ruta_pdf VARCHAR(500),
    id_transaccion_externa VARCHAR(255) NULL COMMENT 'ID del pago reportado por el cliente',
    revisado_por_admin BOOLEAN DEFAULT FALSE COMMENT 'Indica si un administrador ya reviso este pago manual',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE SET NULL,
    FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id),
    INDEX idx_estado_vencimiento (estado, fecha_vencimiento),
    INDEX idx_empresa (empresa_id)
);

-- ########## 3. TABLAS DE USUARIOS Y ROLES (ESTRUCTURA COMPLEJA) ##########

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
    creado_por BIGINT, -- Se vinculará con `usuarios(id)` mediante un ALTER TABLE al final
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
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
    creado_por BIGINT, -- Puede ser un super_admin o un admin de la empresa
    actualizado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (tipo_usuario_id) REFERENCES tipos_usuario(id)
);

-- ########## 4. ESTRUCTURA DE PERSONAL Y SERVICIOS ##########

CREATE TABLE personal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    usuario_id BIGINT UNIQUE,
    sucursal_id BIGINT NULL COMMENT 'Sucursal principal del personal',
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    calificacion DECIMAL(3,2),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE SET NULL
);

CREATE TABLE categorias_servicio (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    nombre VARCHAR(100),
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE TABLE servicios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    categoria_id BIGINT,
    nombre VARCHAR(100),
    descripcion TEXT,
    duracion INT COMMENT 'Duración en minutos',
    precio DECIMAL(10,2) COMMENT 'Precio base o por defecto del servicio',
    estado INT DEFAULT 0 COMMENT '0: Activo, 1: Inactivo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias_servicio(id)
);

-- NUEVA TABLA: Vincula servicios a sucursales con precios específicos.
CREATE TABLE servicios_sucursal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sucursal_id BIGINT NOT NULL,
    servicio_id BIGINT NOT NULL,
    precio DECIMAL(10,2) NOT NULL COMMENT 'Precio del servicio en esta sucursal específica',
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
    UNIQUE KEY unico_sucursal_servicio (sucursal_id, servicio_id)
);

CREATE TABLE servicios_personal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    personal_id BIGINT,
    servicio_id BIGINT,
    principal BOOLEAN DEFAULT FALSE,
    estado INT DEFAULT 0,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    FOREIGN KEY (personal_id) REFERENCES personal(id),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id),
    UNIQUE KEY unico_personal_servicio (personal_id, servicio_id)
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
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (personal_id) REFERENCES personal(id),
    INDEX idx_personal_dia (personal_id, dia)
);

-- ########## 5. TABLAS DE CLIENTES Y CITAS (EL CORAZÓN OPERATIVO) ##########

CREATE TABLE clientes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    usuario_id BIGINT UNIQUE NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    tipo_documento ENUM('RUT', 'DNI', 'PASAPORTE', 'OTRO') DEFAULT 'DNI',
    numero_documento VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE,
    genero ENUM('Masculino', 'Femenino', 'Otro') DEFAULT 'Otro',
    correo_electronico VARCHAR(100) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'Chile',
    estado ENUM('Activo', 'Inactivo', 'Bloqueado') DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT,
    actualizado_por BIGINT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id),
    FOREIGN KEY (actualizado_por) REFERENCES usuarios(id),
    UNIQUE KEY idx_empresa_documento (empresa_id, tipo_documento, numero_documento)
);

CREATE TABLE citas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    cliente_id BIGINT,
    personal_id BIGINT,
    servicio_id BIGINT,
    sucursal_id BIGINT NOT NULL COMMENT 'Sucursal donde se realizará la cita',
    fecha DATE,
    hora TIME,
    estado ENUM('Programada', 'Completada', 'Cancelada', 'Confirmada', 'Pendiente', 'En_progreso') DEFAULT 'Programada',
    notas TEXT,
    canal ENUM('Online', 'Presencial', 'Telefono', 'Whatsapp') DEFAULT 'Presencial',
    id_evento_google VARCHAR(255),
    origen ENUM('Presencial', 'Automatica', 'Whatsapp', 'N8N', 'Telefono') DEFAULT 'Presencial',
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (personal_id) REFERENCES personal(id),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id),
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
);

-- ########## 6. TABLAS FINANCIERAS Y DE CAJA (NUEVA FUNCIONALIDAD) ##########

-- NUEVA TABLA: Gestiona una o más cajas por sucursal.
CREATE TABLE cajas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sucursal_id BIGINT NOT NULL,
    nombre VARCHAR(100) NOT NULL COMMENT 'Ej: Caja 1, Recepción',
    descripcion TEXT,
    estado ENUM('Abierta', 'Cerrada') DEFAULT 'Cerrada',
    saldo_actual DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Saldo en tiempo real de la caja',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    INDEX idx_sucursal_estado (sucursal_id, estado)
);

-- NUEVA TABLA: Registra cada turno o sesión de una caja (apertura y cierre).
CREATE TABLE sesiones_caja (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    caja_id BIGINT NOT NULL,
    usuario_apertura_id BIGINT NOT NULL,
    usuario_cierre_id BIGINT NULL,
    monto_inicial DECIMAL(12,2) NOT NULL COMMENT 'Dinero con el que se abre la caja',
    monto_final_calculado DECIMAL(12,2) NULL COMMENT 'Monto esperado al cierre (calculado)',
    monto_final_real DECIMAL(12,2) NULL COMMENT 'Dinero contado físicamente al cierre',
    diferencia DECIMAL(12,2) GENERATED ALWAYS AS (IFNULL(monto_final_real, 0) - IFNULL(monto_final_calculado, 0)) STORED,
    fecha_apertura DATETIME NOT NULL,
    fecha_cierre DATETIME NULL,
    estado ENUM('Abierta', 'Cerrada', 'Auditada') DEFAULT 'Abierta',
    notas_cierre TEXT,
    FOREIGN KEY (caja_id) REFERENCES cajas(id),
    FOREIGN KEY (usuario_apertura_id) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_cierre_id) REFERENCES usuarios(id),
    INDEX idx_caja_estado (caja_id, estado)
);

-- NUEVA TABLA: Registra cada ingreso o egreso de dinero de una caja.
CREATE TABLE movimientos_caja (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sesion_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    tipo_movimiento ENUM('Ingreso', 'Egreso') NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    motivo VARCHAR(255) NOT NULL COMMENT 'Ej: Pago cita, Venta producto, Gasto operativo',
    referencia_id BIGINT NULL COMMENT 'ID de la entidad relacionada (cita_id, factura_id)',
    referencia_tabla VARCHAR(100) NULL COMMENT 'Nombre de la tabla de referencia (citas, facturas)',
    metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia', 'Otro') DEFAULT 'Efectivo',
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones_caja(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_sesion_tipo (sesion_id, tipo_movimiento)
);

-- ########## 7. TABLAS DE CONFIGURACIÓN, SOPORTE Y LOGS ##########

CREATE TABLE especialidades (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE especialidades_personal (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    personal_id BIGINT,
    especialidad_id BIGINT,
    principal BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (personal_id) REFERENCES personal(id),
    FOREIGN KEY (especialidad_id) REFERENCES especialidades(id),
    UNIQUE KEY unico_personal_especialidad (personal_id, especialidad_id)
);

CREATE TABLE recordatorios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    nombre VARCHAR(255),
    canal ENUM('Whatsapp', 'Correo', 'SMS'),
    tiempo INT,
    unidad ENUM('Minutos', 'Horas', 'Dias'),
    mensaje TEXT,
    estado INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE TABLE casos_soporte (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    usuario_id BIGINT,
    asunto VARCHAR(255),
    descripcion TEXT,
    prioridad ENUM('Baja', 'Media', 'Alta') DEFAULT 'Media',
    estado INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
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

CREATE TABLE historial_cambios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entidad VARCHAR(100) NOT NULL,
    entidad_id BIGINT NOT NULL,
    campo VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    realizado_por BIGINT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (realizado_por) REFERENCES usuarios(id),
    INDEX idx_entidad (entidad, entidad_id)
);

-- ########## 8. TABLAS AVANZADAS DE FACTURACIÓN Y PLANES ##########

CREATE TABLE codigos_activacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    plan_id BIGINT,
    empresa_id BIGINT NULL,
    duracion_meses INT DEFAULT 1,
    estado ENUM('Activo', 'Usado', 'Expirado', 'Deshabilitado') DEFAULT 'Activo',
    expira_en DATETIME,
    creado_por BIGINT,
    usado_por BIGINT NULL,
    usado_en DATETIME NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES planes_facturacion(id),
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (creado_por) REFERENCES super_administradores(id),
    FOREIGN KEY (usado_por) REFERENCES usuarios(id)
);

CREATE TABLE notificaciones_pago (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    suscripcion_id BIGINT,
    tipo ENUM('Pago_pendiente', 'Pago_vencido', 'Advertencia_suspension', 'Plan_expirado', 'Renovacion_exitosa') NOT NULL,
    mensaje TEXT NOT NULL,
    estado ENUM('Pendiente', 'Enviado', 'Leido') DEFAULT 'Pendiente',
    programado_para DATETIME,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id)
);

CREATE TABLE cambios_plan (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empresa_id BIGINT,
    suscripcion_anterior_id BIGINT,
    suscripcion_nueva_id BIGINT,
    tipo_cambio ENUM('Actualizacion', 'Degradacion', 'Renovacion', 'Activacion') NOT NULL,
    motivo VARCHAR(500),
    fecha_efectiva DATE NOT NULL,
    cambiado_por BIGINT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (suscripcion_anterior_id) REFERENCES suscripciones(id),
    FOREIGN KEY (suscripcion_nueva_id) REFERENCES suscripciones(id),
    FOREIGN KEY (cambiado_por) REFERENCES usuarios(id)
);

-- ########## 9. ALTERACIONES FINALES PARA DEPENDENCIAS CIRCULARES Y FKs NUEVAS ##########

-- Se agrega la clave foránea aquí para evitar un error de dependencia circular
-- durante la creación inicial de las tablas `usuarios` y `tipos_usuario`.
ALTER TABLE tipos_usuario
ADD CONSTRAINT fk_tipos_usuario_creado_por
FOREIGN KEY (creado_por) REFERENCES usuarios(id);

-- Nuevas claves foráneas para las columnas de auditoría
ALTER TABLE funcionalidades
ADD FOREIGN KEY (creado_por) REFERENCES super_administradores(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES super_administradores(id);

ALTER TABLE planes_facturacion
ADD FOREIGN KEY (creado_por) REFERENCES super_administradores(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES super_administradores(id);

ALTER TABLE sucursales
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE plan_funcionalidades
ADD FOREIGN KEY (creado_por) REFERENCES super_administradores(id);

ALTER TABLE facturas
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE usuarios
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE personal
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE categorias_servicio
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE servicios
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE servicios_sucursal
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE servicios_personal
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id);

ALTER TABLE horarios_personal
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE citas
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE cajas
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE recordatorios
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE casos_soporte
ADD FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);

ALTER TABLE notificaciones_pago
ADD FOREIGN KEY (creado_por) REFERENCES usuarios(id);

-- Reactiva las comprobaciones de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;


CREATE TABLE modulos_sistema (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL COMMENT 'Identificador único del módulo (ej: dashboard, appointments)',
    nombre VARCHAR(100) NOT NULL COMMENT 'Texto visible en el menú (ej: Dashboard, Citas)',
    icono VARCHAR(100) NULL COMMENT 'Nombre del ícono (ej: Home, Calendar)',
    ruta VARCHAR(255) UNIQUE NOT NULL COMMENT 'Ruta URL asociada al módulo (ej: /, /appointments)',
    descripcion TEXT NULL COMMENT 'Descripción del módulo o funcionalidad',
    activo BOOLEAN DEFAULT TRUE COMMENT 'Indica si el módulo está habilitado en el sistema',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT NULL COMMENT 'Referencia al usuario o super_admin que creó el módulo',
    actualizado_por BIGINT NULL COMMENT 'Referencia al usuario o super_admin que actualizó el módulo'
);

CREATE TABLE permisos_modulo (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    modulo_id BIGINT NOT NULL,
    tipo_usuario_id BIGINT NULL COMMENT 'ID del tipo de usuario (Admin, Personal, Cliente) o NULL para Super_admin',
    rol_global ENUM('Super_admin', 'Admin_empresa') NULL COMMENT 'Define el rol a nivel global si no se asocia a un tipo_usuario específico. Se usa para Super_admin y Admins de empresa',
    habilitado BOOLEAN DEFAULT TRUE COMMENT 'Indica si este permiso está activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creado_por BIGINT NULL COMMENT 'Referencia al usuario o super_admin que asignó el permiso',
    FOREIGN KEY (modulo_id) REFERENCES modulos_sistema(id),
    FOREIGN KEY (tipo_usuario_id) REFERENCES tipos_usuario(id),
    UNIQUE (modulo_id, tipo_usuario_id, rol_global) COMMENT 'Asegura que no haya permisos duplicados para la misma combinación'
);


CREATE TABLE medios_pago (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nombre del medio de pago (ej: Efectivo, Nequi, Tarjeta de Cr�dito)',
    tipo ENUM('Digital', 'Fisico', 'Tarjeta', 'Transferencia', 'Billetera Digital') NOT NULL COMMENT 'Categor�a del medio de pago',
    activo BOOLEAN DEFAULT TRUE COMMENT 'Indica si el medio de pago est� activo para su uso',
    descripcion TEXT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_por BIGINT NULL COMMENT 'Referencia al usuario o super_admin que cre� el medio de pago',
    actualizado_por BIGINT NULL COMMENT 'Referencia al usuario o super_admin que actualiz� el medio de pago'
);
---Datos actuales de la base de datos:
-- Desactiva las comprobaciones de claves foráneas para permitir la carga de datos en cualquier orden y evitar errores de dependencia temporal
SET FOREIGN_KEY_CHECKS = 0;

-- ########## 1. Super Administradores ##########
INSERT INTO super_administradores (id, nombre, correo_electronico, contrasena, rol, fecha_creacion) VALUES
(1, 'Admin Supremo', 'admin.supremo@system.com', 'hashed_password_1', 'Super_admin', NOW()),
(2, 'Gerente Master', 'gerente.master@system.com', 'hashed_password_2', 'Super_admin', NOW()),
(3, 'Soporte Global', 'soporte.global@system.com', 'hashed_password_3', 'Super_admin', NOW());

-- ########## 2. Funcionalidades ##########
INSERT INTO funcionalidades (id, nombre, clave, descripcion, modulo, activo, creado_por) VALUES
(1, 'Gestión de Citas', 'citas_management', 'Permite crear, modificar y cancelar citas.', 'Citas', TRUE, 1),
(2, 'Gestión de Clientes', 'clientes_management', 'Administración completa de la base de datos de clientes.', 'Clientes', TRUE, 1),
(3, 'Gestión de Personal', 'personal_management', 'Administración de empleados, horarios y servicios.', 'Personal', TRUE, 1),
(4, 'Gestión de Servicios', 'servicios_management', 'Creación y edición de servicios ofrecidos.', 'Servicios', TRUE, 1),
(5, 'Reportes Básicos', 'reportes_basicos', 'Acceso a informes fundamentales de negocio.', 'Reportes', TRUE, 1),
(6, 'Notificaciones Automatizadas', 'notificaciones_auto', 'Envío de recordatorios y confirmaciones automáticas.', 'Comunicacion', TRUE, 1),
(7, 'Integración con Calendario', 'integracion_calendario', 'Sincronización con Google Calendar.', 'Integraciones', TRUE, 1),
(8, 'Gestión de Sucursales', 'sucursales_management', 'Administración de múltiples ubicaciones.', 'Empresa', TRUE, 1),
(9, 'Gestión de Caja', 'caja_management', 'Control de ingresos y egresos de efectivo.', 'Finanzas', TRUE, 1),
(10, 'Facturación Electrónica', 'facturacion_electronica', 'Emisión y gestión de facturas.', 'Finanzas', FALSE, 1);

-- ########## 3. Planes de Facturación (4 planes atractivos) ##########
INSERT INTO planes_facturacion (id, nombre, descripcion, precio, ciclo_facturacion, maximo_citas, maximo_personal, maximo_clientes, maximo_servicios, limite_almacenamiento_gb, nivel_soporte, marca_personalizada, acceso_api, reportes_avanzados, integraciones_permitidas, activo, dias_prueba, creado_por) VALUES
(1, 'Plan Esencial', 'Ideal para pequeños negocios y freelancers. Incluye funcionalidades básicas de agendamiento.', 29.99, 'Mensual', 200, 2, 500, 10, 2, 'Basico', FALSE, FALSE, FALSE, '[]', TRUE, 7, 1),
(2, 'Plan Pro', 'La solución completa para medianas empresas. Todas las herramientas que necesitas para crecer.', 79.99, 'Mensual', 1000, 10, 5000, 50, 10, 'Estandar', TRUE, TRUE, TRUE, '["Google Calendar", "Stripe"]', TRUE, 15, 1),
(3, 'Plan Empresa', 'Diseñado para grandes organizaciones. Soporte prioritario y límites ilimitados.', 199.99, 'Anual', 0, 0, 0, 0, 50, 'Premium', TRUE, TRUE, TRUE, '["Google Calendar", "Stripe", "Zapier", "Mailchimp"]', TRUE, 30, 1),
(4, 'Plan Gratuito', 'Prueba nuestro sistema sin costo, con funcionalidades limitadas.', 0.00, 'Mensual', 50, 1, 100, 3, 0, 'Basico', FALSE, FALSE, FALSE, '[]', TRUE, 0, 1);

-- ########## 4. Relación Plan Funcionalidades ##########
-- Plan Esencial
INSERT INTO plan_funcionalidades (plan_id, funcionalidad_id, limite, habilitado, creado_por) VALUES
(1, 1, 200, TRUE, 1), (1, 2, 500, TRUE, 1), (1, 3, 2, TRUE, 1), (1, 4, 10, TRUE, 1), (1, 5, 0, TRUE, 1);
-- Plan Pro
INSERT INTO plan_funcionalidades (plan_id, funcionalidad_id, limite, habilitado, creado_por) VALUES
(2, 1, 1000, TRUE, 1), (2, 2, 5000, TRUE, 1), (2, 3, 10, TRUE, 1), (2, 4, 50, TRUE, 1), (2, 5, 0, TRUE, 1),
(2, 6, 0, TRUE, 1), (2, 7, 0, TRUE, 1), (2, 8, 0, TRUE, 1), (2, 9, 0, TRUE, 1);
-- Plan Empresa (límites 0 significan ilimitado según el plan_facturacion)
INSERT INTO plan_funcionalidades (plan_id, funcionalidad_id, limite, habilitado, creado_por) VALUES
(3, 1, 0, TRUE, 1), (3, 2, 0, TRUE, 1), (3, 3, 0, TRUE, 1), (3, 4, 0, TRUE, 1), (3, 5, 0, TRUE, 1),
(3, 6, 0, TRUE, 1), (3, 7, 0, TRUE, 1), (3, 8, 0, TRUE, 1), (3, 9, 0, TRUE, 1), (3, 10, 0, TRUE, 1);
-- Plan Gratuito
INSERT INTO plan_funcionalidades (plan_id, funcionalidad_id, limite, habilitado, creado_por) VALUES
(4, 1, 50, TRUE, 1), (4, 2, 100, TRUE, 1), (4, 3, 1, TRUE, 1), (4, 4, 3, TRUE, 1);

-- ########## 5. Empresas (3 Empresas: 1 con 2 sucursales, 2 con 1 sucursal) ##########
INSERT INTO empresas (id, nombre, nit, direccion, telefono, correo_electronico, descripcion, sitio_web, industria, creado_por) VALUES
(1, 'Centro Médico Bienestar S.A.', '900123456-7', 'Av. Siempre Viva 123', '123456789', 'info@bienestar.com', 'Clínica especializada en salud integral.', 'www.bienestar.com', 'Salud', 1),
(2, 'Estética Glamour Spa', '800987654-3', 'Calle del Sol 456', '987654321', 'contacto@glamour.com', 'Spa y centro de belleza con servicios premium.', 'www.glamour.com', 'Belleza', 1),
(3, 'Consultoría Digital Pro', '700112233-0', 'Carrera 7 #1-10', '321987654', 'admin@digitalpro.com', 'Consultores líderes en transformación digital.', 'www.digitalpro.com', 'Consultoría', 2);

-- ########## 6. Sucursales ##########
-- Empresa 1: 2 sucursales
INSERT INTO sucursales (id, empresa_id, nombre, direccion, ciudad, telefono, correo_electronico, estado, creado_por) VALUES
(1, 1, 'Sede Principal Bienestar', 'Av. Siempre Viva 123, Bogotá', 'Bogotá', '123456789', 'principal@bienestar.com', 'Activa', NULL), -- creado_por will be updated
(2, 1, 'Sucursal Norte Bienestar', 'Calle 100 #20-30, Bogotá', 'Bogotá', '123456790', 'norte@bienestar.com', 'Activa', NULL); -- creado_por will be updated
-- Empresa 2: 1 sucursal
INSERT INTO sucursales (id, empresa_id, nombre, direccion, ciudad, telefono, correo_electronico, estado, creado_por) VALUES
(3, 2, 'Sede Centro Glamour', 'Calle del Sol 456, Medellín', 'Medellín', '987654321', 'centro@glamour.com', 'Activa', NULL); -- creado_por will be updated
-- Empresa 3: 1 sucursal
INSERT INTO sucursales (id, empresa_id, nombre, direccion, ciudad, telefono, correo_electronico, estado, creado_por) VALUES
(4, 3, 'Oficina Central DigitalPro', 'Carrera 7 #1-10, Santiago', 'Santiago', '321987654', 'oficina@digitalpro.com', 'Activa', NULL); -- creado_por will be updated

-- ########## 7. Tipos de Usuario ##########
INSERT INTO tipos_usuario (id, empresa_id, nombre, descripcion, permisos, nivel, estado, creado_por) VALUES
(1, 1, 'Administrador Clínica', 'Administrador principal de la clínica', '{"citas":true, "personal":true, "clientes":true, "reportes":true}', 'Admin', 0, NULL), -- creado_por will be updated
(2, 1, 'Recepcionista', 'Maneja el agendamiento y atención al cliente', '{"citas":true, "clientes":true}', 'Personal', 0, NULL),
(3, 1, 'Médico Especialista', 'Profesional de la salud que atiende las citas', '{"citas":true}', 'Personal', 0, NULL),
(4, 1, 'Paciente VIP', 'Cliente con acceso a beneficios especiales', '{"agendar_online":true}', 'Cliente', 0, NULL),
(5, 2, 'Administrador Spa', 'Administrador principal del spa', '{"citas":true, "personal":true, "clientes":true}', 'Admin', 0, NULL),
(6, 2, 'Esteticista', 'Encargado de tratamientos de belleza', '{"citas":true}', 'Personal', 0, NULL),
(7, 3, 'Consultor Senior', 'Líder de proyectos y atención a clientes corporativos', '{"citas":true, "clientes":true, "reportes":true}', 'Admin', 0, NULL);

-- ########## 8. Usuarios ##########
INSERT INTO usuarios (id, empresa_id, tipo_usuario_id, nombre, correo_electronico, contrasena, rol, telefono, estado, creado_por) VALUES
-- Empresa 1
(1, 1, 1, 'Ana García', 'ana.garcia@bienestar.com', 'pass_ana', 'Admin', '3001112233', 0, 1),
(2, 1, 2, 'Carlos Ruiz', 'carlos.ruiz@bienestar.com', 'pass_carlos', 'Personal', '3004445566', 0, 1),
(3, 1, 3, 'Dr. Jorge López', 'jorge.lopez@bienestar.com', 'pass_jorge', 'Personal', '3007778899', 0, 1),
(4, 1, 3, 'Dra. Laura Soto', 'laura.soto@bienestar.com', 'pass_laura', 'Personal', '3009990011', 0, 1),
(5, 1, 4, 'María Fernández', 'maria.f@mail.com', 'pass_maria', 'Cliente', '3012223344', 0, 1),
(6, 1, 4, 'Pedro Martínez', 'pedro.m@mail.com', 'pass_pedro', 'Cliente', '3015556677', 0, 1),
-- Empresa 2
(7, 2, 5, 'Sofía Vargas', 'sofia.vargas@glamour.com', 'pass_sofia', 'Admin', '3021112233', 0, 1),
(8, 2, 6, 'Elena Pardo', 'elena.pardo@glamour.com', 'pass_elena', 'Personal', '3024445566', 0, 1),
(9, 2, 6, 'Juanita Mora', 'juanita.mora@glamour.com', 'pass_juanita', 'Personal', '3027778899', 0, 1),
(10, 2, NULL, 'Andrés Gomez', 'andres.g@mail.com', 'pass_andres', 'Cliente', '3031112233', 0, 1),
-- Empresa 3
(11, 3, 7, 'Ricardo Díaz', 'ricardo.diaz@digitalpro.com', 'pass_ricardo', 'Admin', '3041112233', 0, 2),
(12, 3, NULL, 'Luisa Pérez', 'luisa.p@mail.com', 'pass_luisa', 'Cliente', '3051112233', 0, 2);

-- Actualizar creado_por para sucursales y tipos_usuario ahora que existen usuarios
UPDATE sucursales SET creado_por = 1 WHERE id IN (1,2); -- Ana García
UPDATE sucursales SET creado_por = 7 WHERE id = 3;    -- Sofía Vargas
UPDATE sucursales SET creado_por = 11 WHERE id = 4;   -- Ricardo Díaz

UPDATE tipos_usuario SET creado_por = 1 WHERE empresa_id = 1; -- Ana García
UPDATE tipos_usuario SET creado_por = 7 WHERE empresa_id = 2; -- Sofía Vargas
UPDATE tipos_usuario SET creado_por = 11 WHERE empresa_id = 3; -- Ricardo Díaz

-- ########## 9. Personal ##########
INSERT INTO personal (id, empresa_id, usuario_id, sucursal_id, estado, calificacion, creado_por) VALUES
(1, 1, 2, 1, 0, 4.80, 1), -- Carlos Ruiz (Recepcionista - Sede Principal)
(2, 1, 3, 1, 0, 4.95, 1), -- Dr. Jorge López (Médico - Sede Principal)
(3, 1, 4, 2, 0, 4.70, 1), -- Dra. Laura Soto (Médico - Sucursal Norte)
(4, 2, 8, 3, 0, 4.90, 7), -- Elena Pardo (Esteticista - Sede Centro)
(5, 2, 9, 3, 0, 4.75, 7); -- Juanita Mora (Esteticista - Sede Centro)

-- ########## 10. Categorías Servicio ##########
INSERT INTO categorias_servicio (id, empresa_id, nombre, descripcion, creado_por) VALUES
(1, 1, 'Consultas Médicas', 'Servicios de diagnóstico y tratamiento médico.', 1),
(2, 1, 'Terapias', 'Sesiones de fisioterapia y rehabilitación.', 1),
(3, 2, 'Tratamientos Faciales', 'Cuidado y embellecimiento de la piel del rostro.', 7),
(4, 2, 'Masajes Terapéuticos', 'Relajación y alivio del dolor muscular.', 7),
(5, 3, 'Consultoría Estratégica', 'Asesoramiento para la planificación y ejecución de estrategias digitales.', 11),
(6, 3, 'Desarrollo de Software', 'Creación de soluciones de software a medida.', 11);

-- ########## 11. Servicios ##########
INSERT INTO servicios (id, empresa_id, categoria_id, nombre, descripcion, duracion, precio, estado, creado_por) VALUES
(1, 1, 1, 'Consulta General', 'Revisión médica completa y diagnóstico.', 30, 50.00, 0, 1),
(2, 1, 1, 'Control Pediátrico', 'Seguimiento de salud infantil.', 45, 60.00, 0, 1),
(3, 1, 2, 'Sesión Fisioterapia', 'Tratamiento de rehabilitación física.', 60, 75.00, 0, 1),
(4, 2, 3, 'Limpieza Facial Profunda', 'Limpieza y purificación de la piel.', 90, 80.00, 0, 7),
(5, 2, 3, 'Hidratación Facial', 'Tratamiento intensivo de hidratación.', 60, 65.00, 0, 7),
(6, 2, 4, 'Masaje Relajante', 'Masaje de cuerpo completo para el estrés.', 60, 90.00, 0, 7),
(7, 3, 5, 'Diagnóstico Digital', 'Análisis de la situación digital actual de la empresa.', 120, 250.00, 0, 11),
(8, 3, 6, 'Desarrollo Web (Estimación)', 'Reunión para estimar costos y tiempos de desarrollo web.', 60, 0.00, 0, 11);

-- ########## 12. Servicios Sucursal ##########
INSERT INTO servicios_sucursal (sucursal_id, servicio_id, precio, estado, creado_por) VALUES
(1, 1, 50.00, 'Activo', 1), (1, 2, 60.00, 'Activo', 1), (1, 3, 75.00, 'Activo', 1), -- Sede Principal Bienestar
(2, 1, 55.00, 'Activo', 1), (2, 2, 65.00, 'Activo', 1), -- Sucursal Norte Bienestar (precios ligeramente diferentes)
(3, 4, 80.00, 'Activo', 7), (3, 5, 65.00, 'Activo', 7), (3, 6, 90.00, 'Activo', 7), -- Sede Centro Glamour
(4, 7, 250.00, 'Activo', 11), (4, 8, 0.00, 'Activo', 11); -- Oficina Central DigitalPro

-- ########## 13. Servicios Personal ##########
INSERT INTO servicios_personal (personal_id, servicio_id, principal, creado_por) VALUES
(2, 1, TRUE, 1), (2, 2, TRUE, 1), -- Dr. Jorge López: Consulta General, Control Pediátrico
(3, 1, FALSE, 1), (3, 2, FALSE, 1), -- Dra. Laura Soto: Consulta General, Control Pediátrico
(3, 3, TRUE, 1), -- Dra. Laura Soto: Sesión Fisioterapia (su especialidad)
(4, 4, TRUE, 7), (4, 5, TRUE, 7), -- Elena Pardo: Limpieza Facial, Hidratación Facial
(5, 6, TRUE, 7), -- Juanita Mora: Masaje Relajante
(4, 6, FALSE, 7); -- Elena Pardo también hace Masaje Relajante

-- ########## 14. Horarios Personal ##########
INSERT INTO horarios_personal (personal_id, dia, hora_inicio, hora_fin, activo, creado_por) VALUES
(2, 'Lunes', '09:00:00', '17:00:00', TRUE, 1),
(2, 'Miercoles', '09:00:00', '17:00:00', TRUE, 1),
(2, 'Viernes', '09:00:00', '13:00:00', TRUE, 1),
(3, 'Martes', '10:00:00', '18:00:00', TRUE, 1),
(3, 'Jueves', '10:00:00', '18:00:00', TRUE, 1),
(4, 'Lunes', '10:00:00', '19:00:00', TRUE, 7),
(4, 'Miercoles', '10:00:00', '19:00:00', TRUE, 7),
(5, 'Martes', '09:00:00', '18:00:00', TRUE, 7),
(5, 'Jueves', '09:00:00', '18:00:00', TRUE, 7);

-- ########## 15. Clientes ##########
INSERT INTO clientes (id, empresa_id, usuario_id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, genero, correo_electronico, telefono, direccion, ciudad, pais, estado, creado_por, actualizado_por) VALUES
(1, 1, 5, 'María', 'Fernández', 'DNI', '12345678-9', '1985-05-10', 'Femenino', 'maria.f@mail.com', '3012223344', 'Calle 10 #1-10', 'Bogotá', 'Chile', 'Activo', 1, 1),
(2, 1, 6, 'Pedro', 'Martínez', 'DNI', '98765432-1', '1990-11-20', 'Masculino', 'pedro.m@mail.com', '3015556677', 'Carrera 5 #2-20', 'Bogotá', 'Chile', 'Activo', 1, 1),
(3, 1, NULL, 'Sofía', 'Ramírez', 'DNI', '11223344-5', '1978-01-15', 'Femenino', 'sofia.r@email.com', '3018889900', 'Av. Siempre Viva 50', 'Bogotá', 'Chile', 'Activo', 1, 1),
(4, 2, 10, 'Andrés', 'Gomez', 'DNI', '55667788-9', '1995-03-25', 'Masculino', 'andres.g@mail.com', '3031112233', 'Calle Luna 100', 'Medellín', 'Chile', 'Activo', 7, 7),
(5, 2, NULL, 'Laura', 'Díaz', 'DNI', '99887766-5', '1982-07-01', 'Femenino', 'laura.d@email.com', '3034445566', 'Carrera Sol 200', 'Medellín', 'Chile', 'Activo', 7, 7),
(6, 3, 12, 'Luisa', 'Pérez', 'DNI', '44332211-0', '1988-09-12', 'Femenino', 'luisa.p@mail.com', '3051112233', 'Diagonal 3 #4-50', 'Santiago', 'Chile', 'Activo', 11, 11),
(7, 1, NULL, 'Juan', 'Pérez', 'DNI', '23456789-0', '1992-04-01', 'Masculino', 'juan.perez@example.com', '3019998877', 'Calle Falsa 123', 'Bogotá', 'Chile', 'Activo', 1, 1),
(8, 1, NULL, 'Carolina', 'Sánchez', 'DNI', '34567890-1', '1980-06-15', 'Femenino', 'carolina.s@example.com', '3018887766', 'Av. Real 456', 'Bogotá', 'Chile', 'Activo', 1, 1),
(9, 2, NULL, 'Diego', 'Castro', 'DNI', '45678901-2', '1993-02-28', 'Masculino', 'diego.c@example.com', '3026665544', 'Cra. Imaginaria 789', 'Medellín', 'Chile', 'Activo', 7, 7),
(10, 2, NULL, 'Valeria', 'Rojas', 'DNI', '56789012-3', '1987-10-05', 'Femenino', 'valeria.r@example.com', '3023332211', 'El Jardín 101', 'Medellín', 'Chile', 'Activo', 7, 7);

-- ########## 16. Citas (aprox. 40 citas) ##########
INSERT INTO citas (empresa_id, cliente_id, personal_id, servicio_id, sucursal_id, fecha, hora, estado, notas, canal, origen, creado_por) VALUES
-- Citas para Centro Médico Bienestar S.A. (Empresa 1) - Sucursal 1 (Sede Principal)
(1, 1, 2, 1, 1, '2025-07-01', '10:00:00', 'Programada', 'Cliente con tos persistente.', 'Online', 'Automatica', 5), -- María F. con Dr. Jorge L. (Consulta General)
(1, 2, 2, 2, 1, '2025-07-01', '11:00:00', 'Programada', 'Control de rutina.', 'Telefono', 'Presencial', 2), -- Pedro M. con Dr. Jorge L. (Control Pediátrico)
(1, 3, 2, 1, 1, '2025-07-02', '09:30:00', 'Confirmada', 'Dolor de cabeza frecuente.', 'Online', 'Automatica', 3), -- Sofía R. con Dr. Jorge L.
(1, 1, 2, 1, 1, '2025-06-25', '14:00:00', 'Completada', 'Receta enviada.', 'Presencial', 'Telefono', 2),
(1, 2, 2, 2, 1, '2025-06-24', '15:00:00', 'Completada', 'Vacunas al día.', 'Presencial', 'Telefono', 2),
(1, 7, 2, 1, 1, '2025-07-03', '10:00:00', 'Programada', 'Nueva consulta.', 'Online', 'Automatica', 7),
(1, 8, 2, 2, 1, '2025-07-03', '11:00:00', 'Programada', 'Chequeo general.', 'Whatsapp', 'Whatsapp', 8),
-- Citas para Centro Médico Bienestar S.A. (Empresa 1) - Sucursal 2 (Sucursal Norte)
(1, 1, 3, 3, 2, '2025-07-01', '16:00:00', 'Programada', 'Sesión de espalda baja.', 'Online', 'Automatica', 5), -- María F. con Dra. Laura S. (Fisioterapia)
(1, 3, 3, 3, 2, '2025-07-02', '14:00:00', 'Pendiente', 'Reevaluación de rodilla.', 'Telefono', 'Presencial', 2),
(1, 2, 3, 1, 2, '2025-06-20', '10:00:00', 'Cancelada', 'Cliente no pudo asistir.', 'Online', 'Automatica', 6),
(1, 7, 3, 3, 2, '2025-07-04', '09:00:00', 'Programada', 'Dolor crónico de hombro.', 'Online', 'Automatica', 7),
(1, 8, 3, 1, 2, '2025-07-04', '10:00:00', 'Programada', 'Control post-operatorio.', 'Telefono', 'N8N', 8),

-- Citas para Estética Glamour Spa (Empresa 2) - Sucursal 3 (Sede Centro)
(2, 4, 4, 4, 3, '2025-07-05', '09:00:00', 'Programada', 'Cliente desea limpieza facial.', 'Online', 'Automatica', 10), -- Andrés G. con Elena P. (Limpieza Facial)
(2, 5, 4, 5, 3, '2025-07-05', '11:00:00', 'Confirmada', 'Piel seca.', 'Whatsapp', 'Whatsapp', 7), -- Laura D. con Elena P. (Hidratación Facial)
(2, 4, 5, 6, 3, '2025-07-06', '14:00:00', 'Programada', 'Masaje de relajación.', 'Presencial', 'Presencial', 8), -- Andrés G. con Juanita M. (Masaje Relajante)
(2, 5, 4, 4, 3, '2025-06-26', '10:00:00', 'Completada', 'Piel radiante.', 'Online', 'Automatica', 7),
(2, 9, 4, 5, 3, '2025-07-07', '09:30:00', 'Programada', 'Preferencia por productos naturales.', 'Online', 'Automatica', 9),
(2, 10, 5, 6, 3, '2025-07-07', '11:00:00', 'Programada', 'Masaje descontracturante.', 'Telefono', 'Telefono', 7),

-- Citas adicionales variadas
-- Empresa 1, Sucursal 1
(1, 1, 2, 1, 1, '2025-07-08', '09:00:00', 'Programada', 'Seguimiento.', 'Online', 'Automatica', 5),
(1, 3, 2, 1, 1, '2025-07-08', '10:00:00', 'Programada', 'Revisión general.', 'Online', 'Automatica', 3),
(1, 7, 2, 2, 1, '2025-07-09', '11:00:00', 'Programada', 'Control de crecimiento.', 'Presencial', 'Presencial', 2),
(1, 8, 2, 1, 1, '2025-07-09', '12:00:00', 'Programada', 'Cita de seguimiento.', 'Whatsapp', 'Whatsapp', 8),
(1, 1, 2, 1, 1, '2025-06-20', '09:00:00', 'Completada', 'Sin novedades.', 'Online', 'Automatica', 5),
(1, 2, 2, 2, 1, '2025-06-21', '10:00:00', 'Completada', 'Todo en orden.', 'Telefono', 'Telefono', 2),
(1, 3, 2, 1, 1, '2025-06-22', '11:00:00', 'Completada', 'Se recomienda descanso.', 'Online', 'N8N', 3),
(1, 7, 2, 1, 1, '2025-06-23', '12:00:00', 'Completada', 'Tratamiento iniciado.', 'Online', 'Automatica', 7),
(1, 8, 2, 2, 1, '2025-06-24', '13:00:00', 'Completada', 'Resultados positivos.', 'Whatsapp', 'Whatsapp', 8),
(1, 1, 2, 1, 1, '2025-06-25', '14:00:00', 'Completada', 'Nueva cita en 1 mes.', 'Presencial', 'Presencial', 2),
(1, 2, 2, 2, 1, '2025-06-26', '15:00:00', 'Completada', 'Control anual.', 'Telefono', 'Telefono', 2),

-- Empresa 1, Sucursal 2
(1, 3, 3, 3, 2, '2025-07-08', '14:00:00', 'Programada', 'Segunda sesión de fisioterapia.', 'Online', 'Automatica', 3),
(1, 7, 3, 1, 2, '2025-07-09', '10:30:00', 'Programada', 'Check-up.', 'Whatsapp', 'Whatsapp', 7),
(1, 8, 3, 3, 2, '2025-07-10', '15:00:00', 'Programada', 'Dolor de cuello.', 'Online', 'Automatica', 8),
(1, 1, 3, 3, 2, '2025-06-20', '16:00:00', 'Completada', 'Ejercicios para casa.', 'Online', 'Automatica', 5),
(1, 3, 3, 3, 2, '2025-06-21', '14:00:00', 'Completada', 'Mejoría notable.', 'Telefono', 'Presencial', 2),
(1, 7, 3, 1, 2, '2025-06-22', '10:30:00', 'Completada', 'Sin alergias.', 'Whatsapp', 'N8N', 7),
(1, 8, 3, 3, 2, '2025-06-23', '15:00:00', 'Completada', 'Revisión en 2 semanas.', 'Online', 'Automatica', 8),

-- Empresa 2, Sucursal 3
(2, 4, 4, 4, 3, '2025-07-08', '09:00:00', 'Programada', 'Para evento especial.', 'Online', 'Automatica', 10),
(2, 5, 4, 5, 3, '2025-07-08', '11:00:00', 'Programada', 'Tratamiento de luminosidad.', 'Whatsapp', 'Whatsapp', 7),
(2, 9, 4, 4, 3, '2025-07-09', '10:00:00', 'Programada', 'Puntos negros.', 'Online', 'Automatica', 9),
(2, 10, 5, 6, 3, '2025-07-09', '14:00:00', 'Programada', 'Relajación profunda.', 'Telefono', 'Telefono', 7),
(2, 4, 4, 4, 3, '2025-06-24', '09:00:00', 'Completada', 'Piel suave.', 'Online', 'Automatica', 10),
(2, 5, 4, 5, 3, '2025-06-25', '11:00:00', 'Completada', 'Cutis fresco.', 'Whatsapp', 'Whatsapp', 7),
(2, 9, 4, 4, 3, '2025-06-26', '10:00:00', 'Completada', 'Poros limpios.', 'Online', 'Automatica', 9),
(2, 10, 5, 6, 3, '2025-06-27', '14:00:00', 'Completada', 'Cliente satisfecho.', 'Telefono', 'Telefono', 7),

-- Empresa 3, Sucursal 4
(3, 6, NULL, 7, 4, '2025-07-01', '09:00:00', 'Programada', 'Primera reunión para proyecto X.', 'Online', 'Presencial', 11), -- Luisa P. con Ricardo D. (Diagnóstico Digital)
(3, 6, NULL, 8, 4, '2025-07-03', '10:00:00', 'Pendiente', 'Reunión de seguimiento desarrollo web.', 'Online', 'N8N', 11),
(3, 6, NULL, 7, 4, '2025-06-20', '09:00:00', 'Completada', 'Análisis inicial concluido.', 'Online', 'Presencial', 11);

-- ########## 17. Cajas (1 empresa con 2 cajas, 1 empresa con 1 caja) ##########
-- Empresa 1: Sucursal 1 (1 caja), Sucursal 2 (1 caja)
INSERT INTO cajas (id, sucursal_id, nombre, descripcion, estado, saldo_actual, creado_por) VALUES
(1, 1, 'Caja Principal Sede 1', 'Caja para la recepción principal de la Sede 1.', 'Cerrada', 0.00, 1), -- Creado por Ana (Admin Empresa 1)
(2, 2, 'Caja Sucursal Norte', 'Caja para la recepción de la Sucursal Norte.', 'Cerrada', 0.00, 1); -- Creado por Ana (Admin Empresa 1)
-- Empresa 2: Sucursal 3 (1 caja)
INSERT INTO cajas (id, sucursal_id, nombre, descripcion, estado, saldo_actual, creado_por) VALUES
(3, 3, 'Caja General Spa', 'Caja única para el Spa.', 'Cerrada', 0.00, 7); -- Creado por Sofía (Admin Empresa 2)

-- ########## 18. Sesiones Caja ##########
INSERT INTO sesiones_caja (caja_id, usuario_apertura_id, usuario_cierre_id, monto_inicial, monto_final_calculado, monto_final_real, fecha_apertura, fecha_cierre, estado) VALUES
(1, 2, 2, 100.00, 250.00, 251.00, '2025-06-25 08:00:00', '2025-06-25 17:00:00', 'Cerrada'), -- Carlos Ruiz (Empresa 1)
(1, 2, NULL, 150.00, NULL, NULL, '2025-06-26 08:30:00', NULL, 'Abierta'), -- Carlos Ruiz (Empresa 1)
(3, 8, 8, 50.00, 150.00, 149.50, '2025-06-25 09:00:00', '2025-06-25 18:00:00', 'Cerrada'); -- Elena Pardo (Empresa 2)

-- ########## 19. Movimientos Caja ##########
INSERT INTO movimientos_caja (sesion_id, usuario_id, tipo_movimiento, monto, motivo, referencia_id, referencia_tabla, metodo_pago) VALUES
(1, 2, 'Ingreso', 50.00, 'Pago cita Consulta General', 1, 'citas', 'Efectivo'), -- Cita 1
(1, 2, 'Ingreso', 60.00, 'Pago cita Control Pediátrico', 2, 'citas', 'Tarjeta'), -- Cita 2
(1, 2, 'Egreso', 10.00, 'Gasto de papelería', NULL, NULL, 'Efectivo'),
(1, 2, 'Ingreso', 75.00, 'Pago cita Sesión Fisioterapia', 4, 'citas', 'Efectivo'), -- Cita 4
(2, 2, 'Ingreso', 55.00, 'Pago cita Consulta General', 8, 'citas', 'Efectivo'), -- Cita 8
(3, 8, 'Ingreso', 80.00, 'Pago cita Limpieza Facial', 13, 'citas', 'Tarjeta'), -- Cita 13
(3, 8, 'Ingreso', 65.00, 'Pago cita Hidratación Facial', 14, 'citas', 'Efectivo'); -- Cita 14

-- ########## 20. Suscripciones ##########
INSERT INTO suscripciones (id, empresa_id, plan_id, fecha_inicio, fecha_fin, estado, metodo_pago, renovacion_automatica, creado_por) VALUES
(1, 1, 2, '2024-01-01', '2025-01-01', 'Activa', 'Tarjeta de Crédito', TRUE, 1), -- Centro Médico - Plan Pro
(2, 2, 2, '2024-03-15', '2025-03-15', 'Activa', 'Transferencia Bancaria', TRUE, 1), -- Estética Glamour - Plan Pro
(3, 3, 3, '2024-05-01', '2025-05-01', 'Activa', 'Débito Automático', TRUE, 2), -- Consultoría Digital - Plan Empresa
(4, 1, 4, '2024-12-01', '2025-12-01', 'Expirada', NULL, FALSE, 1); -- Centro Médico - Plan Gratuito (ejemplo de expirado)

-- ########## 21. Facturas ##########
INSERT INTO facturas (id, empresa_id, sucursal_id, suscripcion_id, numero_factura, monto, monto_impuestos, estado, fecha_vencimiento, fecha_pago, medio_pago_id, referencia_pago, revisado_por_admin, creado_por) VALUES
(1, 1, NULL, 1, 'INV-2024-001', 79.99, 15.20, 'Pagada', '2024-01-10', '2024-01-05 10:30:00', 1, 'PAY12345', TRUE, 1),
(2, 2, NULL, 2, 'INV-2024-002', 79.99, 15.20, 'Pagada', '2024-03-25', '2024-03-20 11:00:00', 2, 'TRN98765', TRUE, 7),
(3, 3, NULL, 3, 'INV-2024-003', 199.99, 38.00, 'Pagada', '2025-05-10', '2024-05-01 09:00:00', 3, 'DBT54321', TRUE, 11),
(4, 1, NULL, 1, 'INV-2025-001', 79.99, 15.20, 'No_pagada', '2025-01-10', NULL, NULL, NULL, FALSE, 1);

-- ########## 22. Especialidades ##########
INSERT INTO especialidades (id, empresa_id, nombre, descripcion, creado_por) VALUES
(1, 1, 'Cardiología', 'Especialidad médica para el corazón.', 1),
(2, 1, 'Pediatría', 'Especialidad médica para niños.', 1),
(3, 1, 'Fisioterapia', 'Rehabilitación física.', 1),
(4, 2, 'Estética Facial', 'Tratamientos de belleza facial.', 7),
(5, 2, 'Masoterapia', 'Terapias de masaje.', 7),
(6, 3, 'Transformación Digital', 'Asesoría en digitalización de procesos.', 11);

-- ########## 23. Especialidades Personal ##########
INSERT INTO especialidades_personal (personal_id, especialidad_id, principal) VALUES
(2, 1, TRUE), (2, 2, TRUE), -- Dr. Jorge López: Cardiología, Pediatría
(3, 2, TRUE), (3, 3, TRUE), -- Dra. Laura Soto: Pediatría, Fisioterapia
(4, 4, TRUE), (4, 5, FALSE), -- Elena Pardo: Estética Facial (principal), Masoterapia
(5, 5, TRUE); -- Juanita Mora: Masoterapia (principal)

-- ########## 24. Recordatorios ##########
INSERT INTO recordatorios (id, empresa_id, nombre, canal, tiempo, unidad, mensaje, estado, creado_por) VALUES
(1, 1, 'Recordatorio Cita 24h', 'Whatsapp', 24, 'Horas', 'Hola [CLIENTE_NOMBRE], tu cita con [PERSONAL_NOMBRE] para [SERVICIO_NOMBRE] es mañana a las [CITA_HORA].', 0, 1),
(2, 1, 'Confirmación Cita', 'Correo', 0, 'Minutos', 'Gracias por confirmar tu cita. Te esperamos!', 0, 1),
(3, 2, 'Promoción de Cumpleaños', 'SMS', 7, 'Dias', 'Feliz cumpleaños! Disfruta un 15% de descuento en tu próximo servicio.', 0, 7);

-- ########## 25. Casos Soporte ##########
INSERT INTO casos_soporte (id, empresa_id, usuario_id, asunto, descripcion, prioridad, estado, actualizado_por) VALUES
(1, 1, 1, 'Problema de acceso al portal', 'El administrador Ana García no puede acceder a ciertas funcionalidades.', 'Alta', 0, 1),
(2, 2, 8, 'Duda con horarios de personal', 'Elena Pardo no sabe cómo registrar un turno extra.', 'Media', 0, 7),
(3, 3, 12, 'Solicitud de nueva integración', 'Luisa Pérez solicita integración con plataforma X.', 'Baja', 0, 11);

-- ########## 26. Logs Sistema ##########
INSERT INTO logs_sistema (id, actor_id, tipo_actor, accion, ip, detalles) VALUES
(1, 1, 'Super_admin', 'Creación de Empresa: Centro Médico Bienestar S.A.', '192.168.1.1', 'Empresa 1 creada por Super Admin 1'),
(2, 1, 'Administrador_empresa', 'Actualización de Sucursal: Sede Principal Bienestar', '10.0.0.5', 'Dirección actualizada'),
(3, 5, 'Usuario', 'Creación de Cita: ID 1', '172.16.0.10', 'Cita agendada online por cliente María Fernández'),
(4, 2, 'Administrador_empresa', 'Cierre de Sesión de Caja: Caja Principal Sede 1', '10.0.0.6', 'Cierre de caja diario con diferencia de 1.00');

-- ########## 27. Historial Cambios ##########
INSERT INTO historial_cambios (entidad, entidad_id, campo, valor_anterior, valor_nuevo, realizado_por) VALUES
('citas', 1, 'estado', 'Programada', 'Completada', 2),
('clientes', 1, 'telefono', '3012223344', '3012223355', 1),
('servicios_sucursal', 2, 'precio', '60.00', '65.00', 1);

-- ########## 28. Códigos Activación ##########
INSERT INTO codigos_activacion (id, codigo, plan_id, duracion_meses, estado, expira_en, creado_por, usado_por, usado_en) VALUES
(1, 'FREE-TRIAL-ABC', 4, 1, 'Usado', '2024-02-01 23:59:59', 1, 5, '2024-01-10 10:00:00'),
(2, 'PRO-UPGRADE-XYZ', 2, 3, 'Activo', '2025-12-31 23:59:59', 1, NULL, NULL),
(3, 'EMP-VIP-789', 3, 12, 'Expirado', '2024-06-30 23:59:59', 2, NULL, NULL);

-- ########## 29. Notificaciones Pago ##########
INSERT INTO notificaciones_pago (id, empresa_id, suscripcion_id, tipo, mensaje, estado, programado_para, creado_por) VALUES
(1, 1, 1, 'Pago_pendiente', 'Estimado cliente, su pago por la suscripción Plan Pro está pendiente.', 'Enviado', '2025-01-01 09:00:00', 1),
(2, 2, 2, 'Renovacion_exitosa', 'Su suscripción ha sido renovada con éxito!', 'Leido', '2025-03-15 10:00:00', 7),
(3, 1, 4, 'Plan_expirado', 'Su Plan Gratuito ha expirado. Por favor, considere actualizar.', 'Pendiente', '2025-01-02 12:00:00', 1);

-- ########## 30. Cambios Plan ##########
INSERT INTO cambios_plan (id, empresa_id, suscripcion_anterior_id, suscripcion_nueva_id, tipo_cambio, motivo, fecha_efectiva, cambiado_por) VALUES
(1, 1, 4, 1, 'Actualizacion', 'Actualización de plan gratuito a Pro', '2024-01-01', 1),
(2, 3, 3, 3, 'Renovacion', 'Renovación anual automática', '2025-05-01', 11);

---
-- ########## 31. Tablas para Gestión de Menús (Nuevos Inserts) ##########

-- Asegúrate de que las tablas estén creadas y los Super Administradores existan (id=1, 2, 3)
-- (Estos inserts asumen que ya ejecutaste el script anterior)

INSERT INTO modulos_sistema (clave, nombre, icono, ruta, descripcion, creado_por) VALUES
('dashboard', 'Dashboard', 'Home', '/', 'Vista general de métricas y actividades.', 1),
('calendar', 'Calendario', 'Calendar', '/calendar', 'Gestión de calendario de citas.', 1),
('appointments', 'Citas', 'Clock', '/appointments', 'Administración de todas las citas.', 1),
('services', 'Servicios', 'Settings', '/services', 'Gestión de servicios ofrecidos.', 1),
('categories', 'Categorías', 'Palette', '/categories', 'Organización de servicios en categorías.', 1),
('specialties', 'Especialidades', 'Award', '/specialties', 'Gestión de especialidades del personal.', 1),
('clients', 'Clientes', 'Users', '/clients', 'Administración de la base de datos de clientes.', 1), -- Cambiado 'users' a 'clients' para ser más específico
('staff', 'Staff', 'UserCheck', '/staff', 'Gestión de personal y sus roles.', 1),
('reports', 'Reportes', 'BarChart3', '/reports', 'Generación de informes y análisis.', 1),
('company-info', 'Mi Empresa', 'Building', '/company', 'Información y configuración de la empresa.', 1),
('admin-profile', 'Mi Perfil', 'User', '/profile', 'Configuración del perfil de usuario.', 1),
('admin-management', 'Administración', 'Shield', '/admin', 'Herramientas de administración del sistema (solo Super Admin).', 1),
('billing', 'Facturación', 'CreditCard', '/billing', 'Gestión de suscripciones y facturas.', 1),
('settings', 'Configuración', 'Cog', '/settings', 'Configuraciones generales del sistema y de la empresa.', 1),
('reminders', 'Recordatorios', 'Bell', '/reminders', 'Gestión de recordatorios automáticos.', 1),
('branches', 'Sucursales', 'MapPin', '/branches', 'Administración de las sucursales de la empresa.', 1), -- Nuevo módulo
('cash-management', 'Cajas', 'DollarSign', '/cash-management', 'Gestión de cajas y movimientos de efectivo.', 1), -- Nuevo módulo
('payments', 'Pagos', 'Wallet', '/payments', 'Registro y seguimiento de pagos de citas/servicios.', 1); -- Nuevo módulo

-- ########## 32. Ejemplos de Asignación de Permisos de Módulo ##########
-- Asumiendo que el `id` de Ana García (Admin Empresa 1) es 1 y Sofía Vargas (Admin Empresa 2) es 7, Ricardo Díaz (Admin Empresa 3) es 11.
-- Asumiendo que los tipos de usuario son: 1 (Admin Clínica), 2 (Recepcionista), 3 (Médico Especialista), 4 (Paciente VIP), 5 (Admin Spa), 6 (Esteticista), 7 (Consultor Senior).

-- Permisos para Super Administrador (rol_global = 'Super_admin')
-- Un Super Admin tiene acceso a TODOS los módulos. Podrías insertar un permiso para cada módulo,
-- o tu aplicación podría asumir que el Super Admin tiene acceso total por defecto.
INSERT INTO permisos_modulo (modulo_id, rol_global, habilitado, creado_por) VALUES
((SELECT id FROM modulos_sistema WHERE clave = 'dashboard'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'calendar'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'appointments'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'services'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'categories'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'specialties'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'clients'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'staff'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'reports'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'company-info'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'admin-profile'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'admin-management'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'billing'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'settings'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'reminders'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'branches'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'cash-management'), 'Super_admin', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'payments'), 'Super_admin', TRUE, 1);

-- Permisos para Administrador de Empresa (rol_global = 'Admin_empresa') - Acceso genérico antes de personalizar por tipo_usuario
-- Por ejemplo, todos los admins de empresa tienen acceso a la mayoría de las funcionalidades de gestión de su empresa.
INSERT INTO permisos_modulo (modulo_id, rol_global, habilitado, creado_por) VALUES
((SELECT id FROM modulos_sistema WHERE clave = 'dashboard'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'calendar'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'appointments'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'services'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'categories'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'specialties'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'clients'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'staff'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'reports'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'company-info'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'admin-profile'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'billing'), 'Admin_empresa', TRUE, 1), -- Pueden ver su facturación
((SELECT id FROM modulos_sistema WHERE clave = 'settings'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'reminders'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'branches'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'cash-management'), 'Admin_empresa', TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'payments'), 'Admin_empresa', TRUE, 1);


-- Permisos específicos para Tipos de Usuario (asignados por un Admin de Empresa, ej. Ana García/Usuario ID 1)
-- Tipo de Usuario: Recepcionista (ID 2 de tipos_usuario)
INSERT INTO permisos_modulo (modulo_id, tipo_usuario_id, habilitado, creado_por) VALUES
((SELECT id FROM modulos_sistema WHERE clave = 'dashboard'), 2, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'calendar'), 2, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'appointments'), 2, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'clients'), 2, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'cash-management'), 2, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'payments'), 2, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'admin-profile'), 2, TRUE, 1);

-- Tipo de Usuario: Médico Especialista (ID 3 de tipos_usuario)
INSERT INTO permisos_modulo (modulo_id, tipo_usuario_id, habilitado, creado_por) VALUES
((SELECT id FROM modulos_sistema WHERE clave = 'dashboard'), 3, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'calendar'), 3, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'appointments'), 3, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'admin-profile'), 3, TRUE, 1);

-- Tipo de Usuario: Paciente VIP (ID 4 de tipos_usuario)
INSERT INTO permisos_modulo (modulo_id, tipo_usuario_id, habilitado, creado_por) VALUES
((SELECT id FROM modulos_sistema WHERE clave = 'dashboard'), 4, TRUE, 1), -- Para ver sus citas, historial
((SELECT id FROM modulos_sistema WHERE clave = 'appointments'), 4, TRUE, 1),
((SELECT id FROM modulos_sistema WHERE clave = 'admin-profile'), 4, TRUE, 1);

-- Tipo de Usuario: Esteticista (ID 6 de tipos_usuario, asignado por Sofía Vargas/Usuario ID 7)
INSERT INTO permisos_modulo (modulo_id, tipo_usuario_id, habilitado, creado_por) VALUES
((SELECT id FROM modulos_sistema WHERE clave = 'dashboard'), 6, TRUE, 7),
((SELECT id FROM modulos_sistema WHERE clave = 'calendar'), 6, TRUE, 7),
((SELECT id FROM modulos_sistema WHERE clave = 'appointments'), 6, TRUE, 7),
((SELECT id FROM modulos_sistema WHERE clave = 'admin-profile'), 6, TRUE, 7);


INSERT INTO medios_pago (id, nombre, tipo, activo, creado_por) VALUES
(1, 'Efectivo', 'Fisico', TRUE, 1),
(2, 'Tarjeta de Credito', 'Tarjeta', TRUE, 1),
(3, 'Tarjeta de Debito', 'Tarjeta', TRUE, 1),
(4, 'Nequi', 'Billetera Digital', TRUE, 1),
(5, 'DaviPlata', 'Billetera Digital', TRUE, 1),
(6, 'PSE', 'Transferencia', TRUE, 1),
(7, 'Transferencia Bancaria', 'Transferencia', TRUE, 1),
(8, 'Bono de Regalo', 'Fisico', TRUE, 1),
(9, 'Credito Interno', 'Digital', TRUE, 1);
-- Reactiva las comprobaciones de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;