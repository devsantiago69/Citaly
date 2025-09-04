import { useState, useEffect } from 'react';
import { Calendar, Plus, RefreshCw, Settings, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { googleCalendarService } from '../lib/google-calendar';

interface GoogleCalendarConfig {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
  primary?: boolean;
  sync_enabled?: boolean;
  sync_direction?: 'bidireccional' | 'solo_importar' | 'solo_exportar';
  last_sync?: string;
  sync_status?: 'sincronizado' | 'pendiente' | 'error';
}

interface SyncLog {
  id: string;
  operation_type: string;
  status: 'exitoso' | 'error' | 'parcial';
  start_time: string;
  end_time?: string;
  events_processed: number;
  events_successful: number;
  events_failed: number;
  error_message?: string;
}

interface GoogleCalendarIntegrationProps {
  onCalendarConnected?: () => void;
  googleCalendars?: any[];
  loading?: boolean;
}

const GoogleCalendarIntegration = ({ 
  onCalendarConnected, 
  googleCalendars = [], 
  loading: externalLoading = false 
}: GoogleCalendarIntegrationProps) => {
  const [calendars, setCalendars] = useState<GoogleCalendarConfig[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    if (googleCalendars.length > 0) {
      setCalendars(googleCalendars);
      setLoading(false);
    } else {
      loadCalendars();
    }
    loadSyncLogs();
  }, [googleCalendars]);

  const loadCalendars = async () => {
    try {
      setLoading(true);
      const calendarList = await googleCalendarService.getCalendarList();
      setCalendars(calendarList);
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast.error('Error al cargar calendarios');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const logs = await googleCalendarService.getSyncLogs(10);
      setSyncLogs(logs);
    } catch (error) {
      console.error('Error loading sync logs:', error);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const url = await googleCalendarService.getAuthUrl();
      setAuthUrl(url);
      setShowAuthDialog(true);
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast.error('Error al generar URL de autorización');
    }
  };

  const handleSyncCalendar = async (calendarId: string) => {
    try {
      setSyncing(calendarId);
      await googleCalendarService.syncCalendar(calendarId);
      toast.success('Calendario sincronizado exitosamente');
      
      // Recargar datos
      await loadCalendars();
      await loadSyncLogs();
      
      if (onCalendarConnected) {
        onCalendarConnected();
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast.error('Error al sincronizar calendario');
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleSync = async (calendarId: string, enabled: boolean) => {
    try {
      // Aquí iría la lógica para habilitar/deshabilitar sincronización
      toast.success(`Sincronización ${enabled ? 'habilitada' : 'deshabilitada'}`);
      await loadCalendars();
    } catch (error) {
      console.error('Error toggling sync:', error);
      toast.error('Error al cambiar configuración de sincronización');
    }
  };

  const openAuthUrl = () => {
    if (authUrl) {
      window.open(authUrl, '_blank');
      setShowAuthDialog(false);
    }
  };

  const getSyncStatusBadge = (status?: string) => {
    switch (status) {
      case 'sincronizado':
        return <Badge variant="default" className="bg-green-100 text-green-800">Sincronizado</Badge>;
      case 'pendiente':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Sin sincronizar</Badge>;
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'importar':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'exportar':
        return <ExternalLink className="h-4 w-4 text-green-500" />;
      case 'sincronizar':
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading || externalLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de conexión */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Calendarios de Google</h3>
          <p className="text-sm text-gray-600">
            Conecta y sincroniza tus calendarios de Google con Citaly
          </p>
        </div>
        <Button onClick={handleConnectCalendar} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Conectar Calendario
        </Button>
      </div>

      {/* Lista de calendarios conectados */}
      {calendars.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium">Calendarios Conectados</h4>
          {calendars.map((calendar) => (
            <Card key={calendar.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <h5 className="font-medium">{calendar.summary}</h5>
                      {calendar.description && (
                        <p className="text-sm text-gray-600">{calendar.description}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        {getSyncStatusBadge(calendar.sync_status)}
                        {calendar.last_sync && (
                          <span className="text-xs text-gray-500">
                            Último sync: {new Date(calendar.last_sync).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={calendar.sync_enabled || false}
                        onCheckedChange={(checked) => handleToggleSync(calendar.id, checked)}
                      />
                      <Label className="text-sm">Sincronizar</Label>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncCalendar(calendar.id)}
                      disabled={syncing === calendar.id}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${syncing === calendar.id ? 'animate-spin' : ''}`} />
                      {syncing === calendar.id ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium mb-2">No hay calendarios conectados</h4>
            <p className="text-sm text-gray-600 mb-4">
              Conecta tu cuenta de Google para sincronizar calendarios automáticamente
            </p>
            <Button onClick={handleConnectCalendar}>
              <Plus className="h-4 w-4 mr-2" />
              Conectar primer calendario
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Logs de sincronización */}
      {syncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial de Sincronización</CardTitle>
            <CardDescription>
              Últimas operaciones de sincronización realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getOperationIcon(log.operation_type)}
                    <div>
                      <div className="font-medium capitalize">{log.operation_type}</div>
                      <div className="text-sm text-gray-600">
                        {log.events_processed} eventos procesados, {log.events_successful} exitosos
                      </div>
                      {log.error_message && (
                        <div className="text-sm text-red-600">{log.error_message}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {getSyncStatusBadge(log.status)}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(log.start_time).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de autorización */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorizar Google Calendar</DialogTitle>
            <DialogDescription>
              Para conectar tu calendario de Google, necesitas autorizar el acceso a Citaly.
              Se abrirá una nueva ventana para completar la autorización.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAuthDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={openAuthUrl}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Autorizar en Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoogleCalendarIntegration;
