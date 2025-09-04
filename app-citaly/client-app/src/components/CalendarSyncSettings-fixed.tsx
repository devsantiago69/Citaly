import { useState, useEffect } from 'react';
import { Settings, Clock, AlertTriangle, Info, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { googleCalendarService } from '../lib/google-calendar';

interface SyncConfiguration {
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  conflict_resolution: 'google_wins' | 'system_wins' | 'manual' | 'newest_wins';
  sync_window_days: number;
  default_event_duration: number;
  timezone: string;
  sync_direction: string;
  default_calendar_id?: string;
}

interface CalendarSyncSettingsProps {
  googleCalendars?: any[];
  onSettingsUpdate?: () => void;
}

const CalendarSyncSettings = ({ googleCalendars = [], onSettingsUpdate }: CalendarSyncSettingsProps) => {
  const [config, setConfig] = useState<SyncConfiguration>({
    auto_sync_enabled: false,
    sync_interval_minutes: 15,
    conflict_resolution: 'newest_wins',
    sync_window_days: 30,
    default_event_duration: 60,
    timezone: 'America/Bogota',
    sync_direction: 'bidireccional'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const configuration = await googleCalendarService.getSyncConfiguration();
      if (configuration) {
        setConfig({ ...config, ...configuration });
      }
    } catch (error) {
      console.error('Error loading sync configuration:', error);
      // No mostrar error si es la primera vez
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      await googleCalendarService.updateSyncConfiguration(config);
      toast.success('Configuración guardada exitosamente');
      
      if (onSettingsUpdate) {
        onSettingsUpdate();
      }
    } catch (error) {
      console.error('Error saving sync configuration:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (field: keyof SyncConfiguration, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Configuración de Sincronización</h3>
          <p className="text-sm text-gray-600">
            Personaliza cómo se sincronizan tus calendarios con Google
          </p>
        </div>
        <Button onClick={saveConfiguration} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {/* Configuración General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Configuración General
          </CardTitle>
          <CardDescription>
            Configuración básica de sincronización automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sincronización Automática</Label>
              <p className="text-sm text-gray-600">
                Habilitar sincronización automática en intervalos regulares
              </p>
            </div>
            <Switch
              checked={config.auto_sync_enabled}
              onCheckedChange={(checked) => handleConfigChange('auto_sync_enabled', checked)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sync-interval">Intervalo de Sincronización (minutos)</Label>
              <Input
                id="sync-interval"
                type="number"
                min="5"
                max="1440"
                value={config.sync_interval_minutes}
                onChange={(e) => handleConfigChange('sync_interval_minutes', parseInt(e.target.value))}
                disabled={!config.auto_sync_enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync-window">Ventana de Sincronización (días)</Label>
              <Input
                id="sync-window"
                type="number"
                min="1"
                max="365"
                value={config.sync_window_days}
                onChange={(e) => handleConfigChange('sync_window_days', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sync-direction">Dirección de Sincronización</Label>
            <Select
              value={config.sync_direction}
              onValueChange={(value) => handleConfigChange('sync_direction', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bidireccional">Bidireccional (Google ↔ Citaly)</SelectItem>
                <SelectItem value="solo_importar">Solo Importar (Google → Citaly)</SelectItem>
                <SelectItem value="solo_exportar">Solo Exportar (Citaly → Google)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Conflictos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Resolución de Conflictos
          </CardTitle>
          <CardDescription>
            Cómo resolver conflictos cuando existen diferencias entre calendarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conflict-resolution">Estrategia de Resolución</Label>
            <Select
              value={config.conflict_resolution}
              onValueChange={(value: any) => handleConfigChange('conflict_resolution', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest_wins">El más reciente prevalece</SelectItem>
                <SelectItem value="google_wins">Google Calendar prevalece</SelectItem>
                <SelectItem value="system_wins">Sistema Citaly prevalece</SelectItem>
                <SelectItem value="manual">Resolución manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Recomendación:</p>
                <p>
                  "El más reciente prevalece" es la opción más segura para evitar pérdida de datos.
                  Las modificaciones más recientes tendrán prioridad automáticamente.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración Avanzada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Configuración Avanzada
          </CardTitle>
          <CardDescription>
            Opciones adicionales para personalizar la sincronización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-duration">Duración por defecto (minutos)</Label>
              <Input
                id="default-duration"
                type="number"
                min="15"
                max="480"
                step="15"
                value={config.default_event_duration}
                onChange={(e) => handleConfigChange('default_event_duration', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Zona Horaria</Label>
              <Select
                value={config.timezone}
                onValueChange={(value) => handleConfigChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Bogota">Colombia (GMT-5)</SelectItem>
                  <SelectItem value="America/New_York">Nueva York (GMT-5/-4)</SelectItem>
                  <SelectItem value="America/Mexico_City">México (GMT-6)</SelectItem>
                  <SelectItem value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</SelectItem>
                  <SelectItem value="Europe/Madrid">Madrid (GMT+1/+2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {googleCalendars.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="default-calendar">Calendario por Defecto</Label>
              <Select
                value={config.default_calendar_id || ''}
                onValueChange={(value) => handleConfigChange('default_calendar_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar calendario por defecto" />
                </SelectTrigger>
                <SelectContent>
                  {googleCalendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      {calendar.summary || calendar.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Sincronización</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {googleCalendars.length}
              </div>
              <div className="text-sm text-gray-600">Calendarios</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {config.auto_sync_enabled ? 'Activa' : 'Inactiva'}
              </div>
              <div className="text-sm text-gray-600">Sincronización</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {config.sync_interval_minutes}min
              </div>
              <div className="text-sm text-gray-600">Intervalo</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarSyncSettings;
