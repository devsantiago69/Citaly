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
  id: string;
  empresa_id: string;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  conflict_resolution: 'google_wins' | 'system_wins' | 'manual' | 'newest_wins';
  sync_window_days: number;
  default_event_duration: number;
  timezone: string;
  configuracion: any;
}

const CalendarSyncSettings = () => {
  const [config, setConfig] = useState<SyncConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      // Usar nuestro servicio de Google Calendar para obtener configuración
      const syncConfig = await googleCalendarService.getSyncConfiguration();
      
      if (syncConfig) {
        setConfig(syncConfig);
      } else {
        // Configuración por defecto
        const defaultConfig = {
          id: 'default',
          empresa_id: localStorage.getItem('empresaId') || '1',
          auto_sync_enabled: true,
          sync_interval_minutes: 15,
          conflict_resolution: 'manual' as const,
          sync_window_days: 30,
          default_event_duration: 60,
          timezone: 'America/Bogota',
          configuracion: {}
        };
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      // Usar nuestro servicio de Google Calendar para actualizar configuración
      await googleCalendarService.updateSyncConfiguration({
        auto_sync_enabled: config.auto_sync_enabled,
        sync_interval_minutes: config.sync_interval_minutes,
        sync_direction: config.conflict_resolution,
        default_calendar_id: config.configuracion?.default_calendar_id
      });

      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof SyncConfiguration, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">No se pudo cargar la configuración</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Configuración de Sincronización
          </CardTitle>
          <CardDescription>
            Ajusta cómo se sincronizan los calendarios con Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuración general */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuración General</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-sync">Sincronización automática</Label>
                <p className="text-sm text-gray-500">
                  Sincronizar automáticamente en intervalos regulares
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={config.auto_sync_enabled}
                onCheckedChange={(checked) => updateConfig('auto_sync_enabled', checked)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sync-interval">Intervalo de sincronización (minutos)</Label>
                <Input
                  id="sync-interval"
                  type="number"
                  min="5"
                  max="1440"
                  value={config.sync_interval_minutes}
                  onChange={(e) => updateConfig('sync_interval_minutes', parseInt(e.target.value))}
                  disabled={!config.auto_sync_enabled}
                />
                <p className="text-xs text-gray-500">
                  Mínimo 5 minutos, máximo 24 horas (1440 minutos)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync-window">Ventana de sincronización (días)</Label>
                <Input
                  id="sync-window"
                  type="number"
                  min="7"
                  max="365"
                  value={config.sync_window_days}
                  onChange={(e) => updateConfig('sync_window_days', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500">
                  Días hacia adelante y atrás para sincronizar
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-duration">Duración por defecto (minutos)</Label>
                <Input
                  id="default-duration"
                  type="number"
                  min="15"
                  max="480"
                  value={config.default_event_duration}
                  onChange={(e) => updateConfig('default_event_duration', parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500">
                  Para eventos sin duración específica
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Zona horaria</Label>
                <Select
                  value={config.timezone}
                  onValueChange={(value) => updateConfig('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Bogota">Bogotá (GMT-5)</SelectItem>
                    <SelectItem value="America/Mexico_City">Ciudad de México (GMT-6)</SelectItem>
                    <SelectItem value="America/Lima">Lima (GMT-5)</SelectItem>
                    <SelectItem value="America/Santiago">Santiago (GMT-3)</SelectItem>
                    <SelectItem value="America/Buenos_Aires">Buenos Aires (GMT-3)</SelectItem>
                    <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Resolución de conflictos */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Resolución de Conflictos</h3>
            <p className="text-sm text-gray-600">
              Qué hacer cuando hay diferencias entre Google Calendar y el sistema
            </p>

            <div className="space-y-2">
              <Label htmlFor="conflict-resolution">Estrategia de resolución</Label>
              <Select
                value={config.conflict_resolution}
                onValueChange={(value) => updateConfig('conflict_resolution', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">
                    <div>
                      <div className="font-medium">Manual</div>
                      <div className="text-xs text-gray-500">Revisar conflictos manualmente</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="google_wins">
                    <div>
                      <div className="font-medium">Google Calendar gana</div>
                      <div className="text-xs text-gray-500">Priorizar cambios de Google</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="system_wins">
                    <div>
                      <div className="font-medium">Sistema gana</div>
                      <div className="text-xs text-gray-500">Priorizar cambios del sistema</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="newest_wins">
                    <div>
                      <div className="font-medium">Más reciente gana</div>
                      <div className="text-xs text-gray-500">Priorizar el cambio más reciente</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.conflict_resolution === 'manual' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Resolución manual activada</p>
                    <p>Los conflictos se mostrarán en una lista para que los resuelvas manualmente.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Configuración avanzada */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuración Avanzada</h3>
            
            <div className="space-y-2">
              <Label htmlFor="advanced-config">Configuración JSON</Label>
              <Textarea
                id="advanced-config"
                value={JSON.stringify(config.configuracion, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateConfig('configuracion', parsed);
                  } catch (error) {
                    // Ignorar errores de parsing mientras se escribe
                  }
                }}
                rows={6}
                className="font-mono text-sm"
                placeholder='{"custom_field": "value"}'
              />
              <p className="text-xs text-gray-500">
                Configuración adicional en formato JSON
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarSyncSettings;