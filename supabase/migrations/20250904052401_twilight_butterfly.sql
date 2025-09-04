/*
  # Datos de demostración para Citaly

  1. Datos Base
    - Empresa demo
    - Tipos de usuario
    - Usuario administrador
    - Sucursal principal
    - Categorías y servicios básicos

  2. Datos de Prueba
    - Clientes demo
    - Personal demo
    - Citas de ejemplo
    - Configuración de sincronización
*/

-- Insertar empresa demo
INSERT INTO empresas (id, nombre, nit, direccion, telefono, email, descripcion, industria)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Citaly Demo Clinic',
  '900123456-7',
  'Calle 123 #45-67, Bogotá',
  '+57 1 234 5678',
  'info@citaly.com',
  'Clínica de demostración para el sistema Citaly',
  'Salud y Bienestar'
) ON CONFLICT (id) DO NOTHING;

-- Insertar tipos de usuario
INSERT INTO tipos_usuario (id, empresa_id, nombre, descripcion, nivel, permisos) VALUES
(
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Administrador',
  'Acceso completo al sistema',
  'admin',
  '{
    "appointments": {"read": true, "write": true, "delete": true},
    "users": {"read": true, "write": true, "delete": true},
    "reports": {"read": true, "write": true, "delete": true},
    "billing": {"read": true, "write": true, "delete": true},
    "settings": {"read": true, "write": true, "delete": true},
    "google_calendar": {"read": true, "write": true, "delete": true}
  }'
),
(
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'Personal',
  'Acceso a citas y clientes',
  'staff',
  '{
    "appointments": {"read": true, "write": true, "delete": false},
    "users": {"read": true, "write": false, "delete": false},
    "reports": {"read": true, "write": false, "delete": false},
    "google_calendar": {"read": true, "write": true, "delete": false}
  }'
),
(
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000001',
  'Cliente',
  'Acceso a sus propias citas',
  'client',
  '{
    "appointments": {"read": true, "write": false, "delete": false},
    "google_calendar": {"read": true, "write": true, "delete": true}
  }'
) ON CONFLICT (id) DO NOTHING;

-- Insertar sucursal principal
INSERT INTO sucursales (id, empresa_id, nombre, direccion, telefono, email, horario_atencion)
VALUES (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000001',
  'Sucursal Principal',
  'Calle 123 #45-67, Bogotá',
  '+57 1 234 5678',
  'principal@citaly.com',
  '{
    "lunes": {"inicio": "08:00", "fin": "18:00"},
    "martes": {"inicio": "08:00", "fin": "18:00"},
    "miercoles": {"inicio": "08:00", "fin": "18:00"},
    "jueves": {"inicio": "08:00", "fin": "18:00"},
    "viernes": {"inicio": "08:00", "fin": "18:00"},
    "sabado": {"inicio": "08:00", "fin": "14:00"}
  }'
) ON CONFLICT (id) DO NOTHING;

-- Insertar categorías de servicios
INSERT INTO categorias_servicio (id, empresa_id, nombre, descripcion, color) VALUES
(
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000001',
  'Consultas Médicas',
  'Consultas médicas generales y especializadas',
  '#3B82F6'
),
(
  '00000000-0000-0000-0000-000000000032',
  '00000000-0000-0000-0000-000000000001',
  'Terapias',
  'Terapias físicas y de rehabilitación',
  '#10B981'
),
(
  '00000000-0000-0000-0000-000000000033',
  '00000000-0000-0000-0000-000000000001',
  'Evaluaciones',
  'Evaluaciones y diagnósticos',
  '#8B5CF6'
) ON CONFLICT (id) DO NOTHING;

-- Insertar servicios
INSERT INTO servicios (id, empresa_id, categoria_id, nombre, descripcion, duracion, precio) VALUES
(
  '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000031',
  'Consulta Médica General',
  'Consulta médica general con médico especialista',
  60,
  80000
),
(
  '00000000-0000-0000-0000-000000000042',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000032',
  'Terapia Física',
  'Sesión de terapia física y rehabilitación',
  45,
  60000
),
(
  '00000000-0000-0000-0000-000000000043',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000033',
  'Evaluación Inicial',
  'Evaluación inicial completa del paciente',
  90,
  120000
) ON CONFLICT (id) DO NOTHING;

-- Insertar especialidades
INSERT INTO especialidades (id, empresa_id, nombre, descripcion, color) VALUES
(
  '00000000-0000-0000-0000-000000000051',
  '00000000-0000-0000-0000-000000000001',
  'Medicina General',
  'Atención médica general y preventiva',
  '#3B82F6'
),
(
  '00000000-0000-0000-0000-000000000052',
  '00000000-0000-0000-0000-000000000001',
  'Fisioterapia',
  'Rehabilitación física y terapias',
  '#10B981'
),
(
  '00000000-0000-0000-0000-000000000053',
  '00000000-0000-0000-0000-000000000001',
  'Psicología',
  'Atención psicológica y terapias mentales',
  '#8B5CF6'
) ON CONFLICT (id) DO NOTHING;

-- Insertar configuración de sincronización por defecto
INSERT INTO sync_configuration (empresa_id, auto_sync_enabled, sync_interval_minutes, conflict_resolution, sync_window_days)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  15,
  'manual',
  30
) ON CONFLICT (empresa_id) DO NOTHING;