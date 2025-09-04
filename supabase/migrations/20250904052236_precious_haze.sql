/*
  # Estructura base del sistema Citaly con Google Calendar Integration

  1. Nuevas Tablas
    - `empresas` - Información de empresas/negocios
    - `usuarios` - Usuarios del sistema (admins, staff, clientes)
    - `tipos_usuario` - Tipos de usuario con permisos
    - `sucursales` - Sucursales de las empresas
    - `categorias_servicio` - Categorías de servicios
    - `servicios` - Servicios ofrecidos
    - `servicios_sucursal` - Relación servicios-sucursales con precios
    - `especialidades` - Especialidades del personal
    - `personal` - Personal de la empresa
    - `servicios_personal` - Relación personal-servicios
    - `especialidades_personal` - Relación personal-especialidades
    - `clientes` - Información detallada de clientes
    - `google_calendars` - Calendarios de Google sincronizados
    - `citas` - Citas del sistema
    - `google_events` - Eventos sincronizados con Google Calendar
    - `calendar_sync_logs` - Logs de sincronización

  2. Seguridad
    - Enable RLS en todas las tablas
    - Políticas basadas en empresa_id y auth.uid()
    - Políticas específicas para Google Calendar

  3. Funcionalidades Google Calendar
    - Sincronización bidireccional
    - Múltiples calendarios por cliente
    - Logs de sincronización
    - Manejo de conflictos
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Empresas
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  nit text UNIQUE,
  direccion text,
  telefono text,
  email text,
  descripcion text,
  sitio_web text,
  industria text,
  configuracion jsonb DEFAULT '{}',
  estado boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Tipos de usuario
CREATE TABLE IF NOT EXISTS tipos_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  nivel text CHECK (nivel IN ('admin', 'staff', 'client')) DEFAULT 'client',
  permisos jsonb DEFAULT '{}',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE tipos_usuario ENABLE ROW LEVEL SECURITY;

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_usuario_id uuid REFERENCES tipos_usuario(id),
  nombre text NOT NULL,
  apellidos text,
  email text UNIQUE NOT NULL,
  telefono text,
  tipo_documento text DEFAULT 'DNI',
  numero_documento text,
  fecha_nacimiento date,
  genero text CHECK (genero IN ('masculino', 'femenino', 'otro')) DEFAULT 'otro',
  direccion text,
  ciudad text,
  estado_region text,
  pais text DEFAULT 'Colombia',
  contacto_emergencia_nombre text,
  contacto_emergencia_telefono text,
  contacto_emergencia_relacion text,
  tipo_sangre text,
  alergias text,
  medicamentos_actuales text,
  condiciones_medicas text,
  notas_medicas text,
  fecha_ultimo_chequeo date,
  personal_preferido_id uuid,
  horario_preferido text,
  preferencias_comunicacion text[] DEFAULT ARRAY['email'],
  idioma_preferido text DEFAULT 'es',
  consentimiento_privacidad boolean DEFAULT false,
  consentimiento_marketing boolean DEFAULT false,
  notas text,
  estado text CHECK (estado IN ('activo', 'inactivo', 'bloqueado')) DEFAULT 'activo',
  ultimo_acceso timestamptz,
  total_citas integer DEFAULT 0,
  citas_completadas integer DEFAULT 0,
  citas_canceladas integer DEFAULT 0,
  total_gastado decimal(10,2) DEFAULT 0,
  calificacion_promedio decimal(3,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Sucursales
CREATE TABLE IF NOT EXISTS sucursales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  direccion text NOT NULL,
  telefono text,
  email text,
  horario_atencion jsonb DEFAULT '{}',
  configuracion jsonb DEFAULT '{}',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;

-- Categorías de servicios
CREATE TABLE IF NOT EXISTS categorias_servicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  color text DEFAULT '#3B82F6',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE categorias_servicio ENABLE ROW LEVEL SECURITY;

-- Servicios
CREATE TABLE IF NOT EXISTS servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES categorias_servicio(id),
  nombre text NOT NULL,
  descripcion text,
  duracion integer NOT NULL DEFAULT 60, -- en minutos
  precio decimal(10,2) NOT NULL DEFAULT 0,
  configuracion jsonb DEFAULT '{}',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;

-- Servicios por sucursal (precios específicos)
CREATE TABLE IF NOT EXISTS servicios_sucursal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id uuid REFERENCES servicios(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES sucursales(id) ON DELETE CASCADE,
  precio decimal(10,2),
  disponible boolean DEFAULT true,
  configuracion jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(servicio_id, sucursal_id)
);

ALTER TABLE servicios_sucursal ENABLE ROW LEVEL SECURITY;

-- Especialidades
CREATE TABLE IF NOT EXISTS especialidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  color text DEFAULT '#3B82F6',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE especialidades ENABLE ROW LEVEL SECURITY;

-- Personal
CREATE TABLE IF NOT EXISTS personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES sucursales(id),
  horario jsonb DEFAULT '{}',
  configuracion jsonb DEFAULT '{}',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE personal ENABLE ROW LEVEL SECURITY;

-- Relación servicios-personal
CREATE TABLE IF NOT EXISTS servicios_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid REFERENCES personal(id) ON DELETE CASCADE,
  servicio_id uuid REFERENCES servicios(id) ON DELETE CASCADE,
  nivel_competencia text CHECK (nivel_competencia IN ('principiante', 'intermedio', 'avanzado', 'experto')) DEFAULT 'intermedio',
  anos_experiencia integer DEFAULT 0,
  certificaciones text,
  es_principal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(personal_id, servicio_id)
);

ALTER TABLE servicios_personal ENABLE ROW LEVEL SECURITY;

-- Relación especialidades-personal
CREATE TABLE IF NOT EXISTS especialidades_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid REFERENCES personal(id) ON DELETE CASCADE,
  especialidad_id uuid REFERENCES especialidades(id) ON DELETE CASCADE,
  nivel_competencia text CHECK (nivel_competencia IN ('principiante', 'intermedio', 'avanzado', 'experto')) DEFAULT 'intermedio',
  anos_experiencia integer DEFAULT 0,
  informacion_certificacion text,
  es_principal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(personal_id, especialidad_id)
);

ALTER TABLE especialidades_personal ENABLE ROW LEVEL SECURITY;

-- Clientes (información extendida)
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  -- Información adicional específica de clientes
  historial_medico jsonb DEFAULT '{}',
  preferencias jsonb DEFAULT '{}',
  notas_internas text,
  fecha_ultima_visita date,
  proxima_cita_sugerida date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- ========== GOOGLE CALENDAR INTEGRATION ==========

-- Calendarios de Google sincronizados
CREATE TABLE IF NOT EXISTS google_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  google_calendar_id text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  color text DEFAULT '#3B82F6',
  zona_horaria text DEFAULT 'America/Bogota',
  es_principal boolean DEFAULT false,
  sincronizacion_activa boolean DEFAULT true,
  direccion_sincronizacion text CHECK (direccion_sincronizacion IN ('bidireccional', 'solo_importar', 'solo_exportar')) DEFAULT 'bidireccional',
  ultimo_sync timestamptz,
  access_token text, -- Encrypted
  refresh_token text, -- Encrypted
  token_expiry timestamptz,
  configuracion jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id, google_calendar_id)
);

ALTER TABLE google_calendars ENABLE ROW LEVEL SECURITY;

-- Citas del sistema
CREATE TABLE IF NOT EXISTS citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  personal_id uuid REFERENCES personal(id),
  servicio_id uuid REFERENCES servicios(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES sucursales(id) ON DELETE CASCADE,
  google_calendar_id uuid REFERENCES google_calendars(id),
  google_event_id text, -- ID del evento en Google Calendar
  fecha date NOT NULL,
  hora time NOT NULL,
  duracion integer DEFAULT 60, -- en minutos
  estado text CHECK (estado IN ('programada', 'confirmada', 'en_progreso', 'completada', 'cancelada', 'reagendada')) DEFAULT 'programada',
  canal text CHECK (canal IN ('presencial', 'online', 'whatsapp', 'telefono', 'google_calendar')) DEFAULT 'presencial',
  origen text DEFAULT 'sistema',
  notas text,
  precio_acordado decimal(10,2),
  estado_pago text CHECK (estado_pago IN ('pendiente', 'pagado', 'parcial', 'reembolsado')) DEFAULT 'pendiente',
  medio_pago text,
  recordatorios_enviados jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  sync_status text CHECK (sync_status IN ('sincronizado', 'pendiente', 'error', 'conflicto')) DEFAULT 'pendiente',
  sync_error text,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- Eventos de Google Calendar sincronizados
CREATE TABLE IF NOT EXISTS google_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_calendar_id uuid REFERENCES google_calendars(id) ON DELETE CASCADE,
  cita_id uuid REFERENCES citas(id) ON DELETE SET NULL,
  google_event_id text NOT NULL,
  titulo text NOT NULL,
  descripcion text,
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz NOT NULL,
  zona_horaria text DEFAULT 'America/Bogota',
  es_todo_el_dia boolean DEFAULT false,
  ubicacion text,
  estado text CHECK (estado IN ('confirmado', 'tentativo', 'cancelado')) DEFAULT 'confirmado',
  visibilidad text CHECK (visibilidad IN ('publico', 'privado', 'confidencial')) DEFAULT 'privado',
  asistentes jsonb DEFAULT '[]',
  recordatorios jsonb DEFAULT '[]',
  recurrencia jsonb,
  metadata_google jsonb DEFAULT '{}',
  sync_status text CHECK (sync_status IN ('sincronizado', 'pendiente', 'error', 'conflicto')) DEFAULT 'sincronizado',
  sync_direction text CHECK (sync_direction IN ('importado', 'exportado', 'bidireccional')) DEFAULT 'importado',
  last_modified timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(google_calendar_id, google_event_id)
);

ALTER TABLE google_events ENABLE ROW LEVEL SECURITY;

-- Logs de sincronización
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_calendar_id uuid REFERENCES google_calendars(id) ON DELETE CASCADE,
  tipo_operacion text CHECK (tipo_operacion IN ('import', 'export', 'update', 'delete', 'conflict_resolution')) NOT NULL,
  estado text CHECK (estado IN ('exitoso', 'error', 'parcial')) NOT NULL,
  detalles jsonb DEFAULT '{}',
  eventos_procesados integer DEFAULT 0,
  eventos_exitosos integer DEFAULT 0,
  eventos_con_error integer DEFAULT 0,
  tiempo_inicio timestamptz NOT NULL,
  tiempo_fin timestamptz,
  duracion_ms integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Configuración de sincronización por empresa
CREATE TABLE IF NOT EXISTS sync_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  auto_sync_enabled boolean DEFAULT true,
  sync_interval_minutes integer DEFAULT 15,
  conflict_resolution text CHECK (conflict_resolution IN ('google_wins', 'system_wins', 'manual', 'newest_wins')) DEFAULT 'manual',
  sync_window_days integer DEFAULT 30, -- Días hacia adelante y atrás para sincronizar
  default_event_duration integer DEFAULT 60, -- Duración por defecto en minutos
  timezone text DEFAULT 'America/Bogota',
  configuracion jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE sync_configuration ENABLE ROW LEVEL SECURITY;

-- ========== ÍNDICES PARA PERFORMANCE ==========

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_email ON usuarios(empresa_id, email);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_tipo ON usuarios(empresa_id, tipo_usuario_id);
CREATE INDEX IF NOT EXISTS idx_citas_empresa_fecha ON citas(empresa_id, fecha);
CREATE INDEX IF NOT EXISTS idx_citas_cliente_fecha ON citas(cliente_id, fecha);
CREATE INDEX IF NOT EXISTS idx_citas_personal_fecha ON citas(personal_id, fecha);
CREATE INDEX IF NOT EXISTS idx_citas_google_event ON citas(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_google_events_calendar_date ON google_events(google_calendar_id, fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_google_events_sync_status ON google_events(sync_status) WHERE sync_status != 'sincronizado';
CREATE INDEX IF NOT EXISTS idx_google_calendars_usuario ON google_calendars(usuario_id, sincronizacion_activa);

-- ========== POLÍTICAS RLS ==========

-- Empresas: Solo usuarios autenticados pueden ver su empresa
CREATE POLICY "Users can read own company data"
  ON empresas
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update company data"
  ON empresas
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT u.empresa_id 
      FROM usuarios u 
      JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      WHERE u.id = auth.uid() AND tu.nivel = 'admin'
    )
  );

-- Usuarios: Pueden ver usuarios de su empresa
CREATE POLICY "Users can read company users"
  ON usuarios
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can manage company users"
  ON usuarios
  FOR ALL
  TO authenticated
  USING (
    empresa_id IN (
      SELECT u.empresa_id 
      FROM usuarios u 
      JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      WHERE u.id = auth.uid() AND tu.nivel = 'admin'
    )
  );

-- Google Calendars: Solo el propietario puede acceder
CREATE POLICY "Users can manage own google calendars"
  ON google_calendars
  FOR ALL
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Staff can read client calendars for appointments"
  ON google_calendars
  FOR SELECT
  TO authenticated
  USING (
    usuario_id IN (
      SELECT c.usuario_id 
      FROM clientes c
      JOIN usuarios u ON c.empresa_id = u.empresa_id
      JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      WHERE u.id = auth.uid() AND tu.nivel IN ('admin', 'staff')
    )
  );

-- Citas: Basado en empresa y permisos
CREATE POLICY "Users can read company appointments"
  ON citas
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Clients can read own appointments"
  ON citas
  FOR SELECT
  TO authenticated
  USING (
    cliente_id IN (
      SELECT id FROM clientes WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage company appointments"
  ON citas
  FOR ALL
  TO authenticated
  USING (
    empresa_id IN (
      SELECT u.empresa_id 
      FROM usuarios u 
      JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      WHERE u.id = auth.uid() AND tu.nivel IN ('admin', 'staff')
    )
  );

-- Google Events: Basado en calendario
CREATE POLICY "Users can manage events from own calendars"
  ON google_events
  FOR ALL
  TO authenticated
  USING (
    google_calendar_id IN (
      SELECT id FROM google_calendars WHERE usuario_id = auth.uid()
    )
  );

-- Sync Logs: Solo lectura para propietarios de calendarios
CREATE POLICY "Users can read own sync logs"
  ON calendar_sync_logs
  FOR SELECT
  TO authenticated
  USING (
    google_calendar_id IN (
      SELECT id FROM google_calendars WHERE usuario_id = auth.uid()
    )
  );

-- Sync Configuration: Solo admins
CREATE POLICY "Admins can manage sync configuration"
  ON sync_configuration
  FOR ALL
  TO authenticated
  USING (
    empresa_id IN (
      SELECT u.empresa_id 
      FROM usuarios u 
      JOIN tipos_usuario tu ON u.tipo_usuario_id = tu.id
      WHERE u.id = auth.uid() AND tu.nivel = 'admin'
    )
  );

-- ========== FUNCIONES Y TRIGGERS ==========

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_citas_updated_at BEFORE UPDATE ON citas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_google_calendars_updated_at BEFORE UPDATE ON google_calendars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_google_events_updated_at BEFORE UPDATE ON google_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para sincronizar estadísticas de usuarios
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar estadísticas del cliente cuando cambia una cita
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE usuarios SET
      total_citas = (
        SELECT COUNT(*) FROM citas c 
        JOIN clientes cl ON c.cliente_id = cl.id 
        WHERE cl.usuario_id = (SELECT usuario_id FROM clientes WHERE id = NEW.cliente_id)
      ),
      citas_completadas = (
        SELECT COUNT(*) FROM citas c 
        JOIN clientes cl ON c.cliente_id = cl.id 
        WHERE cl.usuario_id = (SELECT usuario_id FROM clientes WHERE id = NEW.cliente_id) 
        AND c.estado = 'completada'
      ),
      citas_canceladas = (
        SELECT COUNT(*) FROM citas c 
        JOIN clientes cl ON c.cliente_id = cl.id 
        WHERE cl.usuario_id = (SELECT usuario_id FROM clientes WHERE id = NEW.cliente_id) 
        AND c.estado = 'cancelada'
      ),
      total_gastado = (
        SELECT COALESCE(SUM(precio_acordado), 0) FROM citas c 
        JOIN clientes cl ON c.cliente_id = cl.id 
        WHERE cl.usuario_id = (SELECT usuario_id FROM clientes WHERE id = NEW.cliente_id) 
        AND c.estado = 'completada'
      )
    WHERE id = (SELECT usuario_id FROM clientes WHERE id = NEW.cliente_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON citas
  FOR EACH ROW EXECUTE FUNCTION update_user_stats();