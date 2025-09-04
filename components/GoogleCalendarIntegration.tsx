import { useState, useEffect } from 'react';
import { Calendar, Plus, Sync, Settings, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useGoogleCalendar } from '../lib/google-calendar';

interface GoogleCalendarConfig {
  id: string;
  google_calendar_id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  es_principal: boolean;
  sincronizacion_activa: boolean;
  direccion_sincronizacion: 'bidireccional' | 'solo_importar' | 'solo_exportar';
  ultimo_sync?: string;
  sync_status?: 'sincronizado' | 'pendiente' | 'error';
}

interface SyncLog {
  id: string;
  tipo_operacion: string;
  estado: 'exitoso' | 'error' | 'parcial';
  tiempo_inicio: string;
  tiempo_fin?: string;
  eventos_procesados: number;
  eventos_exitosos: number;
  eventos_con_error: number;
  error_message?: string;
}

const GoogleCalendarIntegration = () => {
  const [calendars, setCalendars] = useState<GoogleCalendarConfig[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  
  const { googleService, syncService, getAuthUrl } = useGoogleCalendar();

  useEffect(() => {
    loadCalendars();
    loadSyncLogs();
  }, []);

  const loadCalendars = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('google_calendars')
        .select('*')
        .eq('usuario_id', user.user.id)
        .order('es_principal', { ascending: false });

      if (error) throw error;
      setCalendars(data || []);
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast.error('Error al cargar calendarios');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('calendar_sync_logs')
        .select(`
          *,
          google_calendars!inner(usuario_id)
        `)
        .eq('google_calendars.usuario_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error loading sync logs:', error);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const url = getAuthUrl();
      setAuthUrl(url);
      setShowAuthDialog(true);
    } catch (error) {
      console.error('Error generating auth URL:', error);
      toast.error('Error al generar URL de autorización');
    }
  };

  const handleSyncCalendar = async (calendarId: string, direction?: string) => {
    setSyncing(calendarId);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Llamar a la función de sincronización
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          userId: user.user.id,
          calendarId,
          direction: direction || 'bidireccional',
          force: true
        }
      });

      if (error) throw error;

      toast.success('Sincronización completada exitosamente');
      await loadCalendars();
      await loadSyncLogs();
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast.error('Error en la sincronización');
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleSync = async (calendarId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('google_calendars')
        .update({ sincronizacion_activa: enabled })
        .eq('id', calendarId);

      if (error) throw error;

      setCalendars(prev => 
        prev.map(cal => 
          cal.id === calendarId 
            ? { ...cal, sincronizacion_activa: enabled }
            : cal
        )
      );

      toast.success(enabled ? 'Sincronización activada' : 'Sincronización desactivada');
    } catch (error) {
      console.error('Error toggling sync:', error);
      toast.error('Error al cambiar configuración');
    }
  };

  const handleChangeSyncDirection = async (calendarId: string, direction: string) => {
    try {
      const { error } = await supabase
        .from('google_calendars')
        .update({ direccion_sincronizacion: direction })
        .eq('id', calendarId);

      if (error) throw error;

      setCalendars(prev => 
        prev.map(cal => 
          cal.id === calendarId 
            ? { ...cal, direccion_sincronizacion: direction as any }
            : cal
        )
      );

      toast.success('Dirección de sincronización actualizada');
    } catch (error) {
      console.error('Error updating sync direction:', error);
      toast.error('Error al actualizar configuración');
    }
  };

  const getSyncStatusColor = (status?: string) => {
    switch (status) {
      case 'sincronizado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionLabel = (direction: string) => {
    switch (direction) {
      case 'bidireccional':
        return 'Bidireccional';
      case 'solo_importar':
        return 'Solo importar';
      case 'solo_exportar':
        return 'Solo exportar';
      default:
        return direction;
    }
  };

  const formatSyncTime = (timestamp?: string) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Integración con Google Calendar
              </CardTitle>
              <CardDescription>
                Sincroniza tus citas con Google Calendar para acceso desde cualquier dispositivo
              </CardDescription>
            </div>
            <Button onClick={handleConnectCalendar} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Conectar Calendario
            </Button>
          </div>
        </CardHeader>
      </Card>

      {calendars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay calendarios conectados
            </h3>
            <p className="text-gray-500 text-center mb-6">
              Conecta tu cuenta de Google para sincronizar automáticamente tus citas
              con Google Calendar y acceder desde cualquier dispositivo.
            </p>
            <Button onClick={handleConnectCalendar} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Conectar primer calendario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {calendars.map((calendar) => (
            <Card key={calendar.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: calendar.color }}
                    />
                    <div>
                      <CardTitle className="text-lg">{calendar.nombre}</CardTitle>
                      {calendar.descripcion && (
                        <CardDescription>{calendar.descripcion}</CardDescription>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {calendar.es_principal && (
                          <Badge className="bg-blue-100 text-blue-800">Principal</Badge>
                        )}
                        <Badge className={getSyncStatusColor(calendar.sync_status)}>
                          {calendar.sync_status || 'pendiente'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncCalendar(calendar.id)}
                    disabled={syncing === calendar.id}
                  >
                    {syncing === calendar.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                    ) : (
                      <Sync className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`sync-${calendar.id}`}>Sincronización automática</Label>
                  <Switch
                    id={`sync-${calendar.id}`}
                    checked={calendar.sincronizacion_activa}
                    onCheckedChange={(checked) => handleToggleSync(calendar.id, checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dirección de sincronización</Label>
                  <Select
                    value={calendar.direccion_sincronizacion}
                    onValueChange={(value) => handleChangeSyncDirection(calendar.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bidireccional">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="w-2 h-2 bg-green-500 rounded-full -ml-1"></div>
                          </div>
                          Bidireccional
                        </div>
                      </SelectItem>
                      <SelectItem value="solo_importar">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Solo importar de Google
                        </div>
                      </SelectItem>
                      <SelectItem value="solo_exportar">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Solo exportar a Google
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-gray-500 space-y-1">
                  <p>
                    <strong>Última sincronización:</strong> {formatSyncTime(calendar.ultimo_sync)}
                  </p>
                  <p>
                    <strong>Dirección:</strong> {getDirectionLabel(calendar.direccion_sincronizacion)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncCalendar(calendar.id, 'solo_importar')}
                    disabled={syncing === calendar.id}
                  >
                    Importar ahora
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncCalendar(calendar.id, 'solo_exportar')}
                    disabled={syncing === calendar.id}
                  >
                    Exportar ahora
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Logs de sincronización */}
      {syncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              Historial de Sincronización
            </CardTitle>
            <CardDescription>
              Últimas 10 operaciones de sincronización
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {log.estado === 'exitoso' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : log.estado === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium capitalize">{log.tipo_operacion}</p>
                      <p className="text-sm text-gray-500">
                        {formatSyncTime(log.tiempo_inicio)}
                        {log.tiempo_fin && ` - ${formatSyncTime(log.tiempo_fin)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={
                      log.estado === 'exitoso' ? 'bg-green-100 text-green-800' :
                      log.estado === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }>
                      {log.estado}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      {log.eventos_exitosos}/{log.eventos_procesados} eventos
                    </p>
                    {log.error_message && (
                      <p className="text-xs text-red-600 mt-1 max-w-xs truncate">
                        {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de autorización */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar Google Calendar</DialogTitle>
            <DialogDescription>
              Autoriza el acceso a tu cuenta de Google para sincronizar calendarios
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Permisos requeridos:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ver y editar eventos en tus calendarios</li>
                <li>• Crear nuevos eventos</li>
                <li>• Recibir notificaciones de cambios</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAuthDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => window.open(authUrl, '_blank')}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Autorizar
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Después de autorizar, regresa aquí para completar la configuración
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoogleCalendarIntegration;